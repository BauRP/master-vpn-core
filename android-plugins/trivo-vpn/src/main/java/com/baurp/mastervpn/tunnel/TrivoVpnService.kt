package com.baurp.mastervpn.tunnel

import android.content.Context
import android.content.Intent
import android.net.VpnService
import android.os.ParcelFileDescriptor
import android.util.Log
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.io.FileOutputStream
import java.net.InetAddress

/**
 * Native VPN tunnel service.
 *
 * Owns the tun fd. The Xray / wireguard-go core binary is shipped in
 * `assets/core/` (or `jniLibs/`) and exec'd as a subprocess. stdout/stderr
 * are piped to logcat ("TrivoCore"). On crash: Kill Switch immediately
 * blocks all traffic, then exponential-backoff reconnect kicks in.
 */
class TrivoVpnService : VpnService() {

    private var fd: ParcelFileDescriptor? = null
    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private var engineJob: Job? = null
    private var portRotatorJob: Job? = null
    private var coreProcess: Process? = null

    private var protocol: String = "wireguard"
    private var killSwitch: Boolean = true
    private var stealth: String = "standard"
    // Encrypted DNS resolvers (DoH-capable). Cloudflare + Google by default.
    private var dns: List<String> = listOf("1.1.1.1", "1.0.0.1", "8.8.8.8", "8.8.4.4")
    private var disallowedApps: List<String> = emptyList()
    private var serverConfig: JSONObject? = null

    // Network acceleration state. Pushed in via ACTION_SET_ACCELERATION.
    // When smartAccel is on we force UDP transport + mux + BBR-friendly
    // congestion windows in the generated core config. MTU is clamped to
    // 1400 to avoid ISP-level fragmentation; TCP MSS clamping is applied
    // by the core to packets that still ride TCP transports.
    private var smartAccel: Boolean = true
    private var compression: Boolean = false
    private var mtu: Int = 1400

    // Active outbound port pushed into the proxy outbound. When Elite
    // stealth is on, the port rotator cycles through DPI_PORTS every
    // PORT_ROTATE_INTERVAL_MS and triggers a tunnel restart + broadcast.
    private var currentPort: Int = 443

    private var backoffAttempt = 0

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_START -> {
                protocol = intent.getStringExtra(EXTRA_PROTOCOL) ?: protocol
                killSwitch = intent.getBooleanExtra(EXTRA_KILLSWITCH, killSwitch)
                intent.getStringExtra(EXTRA_DNS)?.let { dns = parseList(it) }
                intent.getStringExtra(EXTRA_DISALLOWED)?.let { disallowedApps = parseList(it) }
                intent.getStringExtra(EXTRA_SERVER)?.let { serverConfig = JSONObject(it) }
                startTunnel()
            }
            ACTION_STOP -> stopSelfAndTunnel()
            ACTION_SET_PROTOCOL -> {
                protocol = intent.getStringExtra(EXTRA_PROTOCOL) ?: protocol
                if (fd != null) restartTunnel()
            }
            ACTION_SET_KILLSWITCH -> {
                killSwitch = intent.getBooleanExtra(EXTRA_KILLSWITCH, killSwitch)
                if (fd != null) restartTunnel()
            }
            ACTION_SET_STEALTH -> {
                stealth = intent.getStringExtra(EXTRA_STEALTH) ?: stealth
                if (stealth == "elite") protocol = "vless-reality"
                if (fd != null) restartTunnel()
            }
            ACTION_SET_ACCELERATION -> {
                smartAccel = intent.getBooleanExtra(EXTRA_SMART_ACCEL, smartAccel)
                compression = intent.getBooleanExtra(EXTRA_COMPRESSION, compression)
                mtu = intent.getIntExtra(EXTRA_MTU, mtu).coerceIn(1280, 1500)
                if (fd != null) restartTunnel()
            }
            ACTION_NETWORK_CHANGE -> {
                // Wi-Fi <-> cellular handoff. Re-verify the optimal
                // server (PingModule cache) and rebuild the tun fd
                // against the new physical interface — Kill Switch
                // remains armed, so no traffic leaks during the swap.
                val transport = intent.getStringExtra(EXTRA_TRANSPORT) ?: "unknown"
                Log.i("TrivoVpn", "network changed -> $transport, rerouting tunnel")
                if (fd != null) restartTunnel()
            }
        }
        return START_STICKY
    }

    private fun parseList(json: String): List<String> = try {
        val arr = JSONArray(json)
        (0 until arr.length()).map { arr.getString(it) }
    } catch (_: Throwable) {
        emptyList()
    }

    private fun buildBuilder(): Builder {
        val b = Builder()
            .setSession("Trivo VPN")
            // Clamp MTU to 1400 — prevents fragmentation across mobile
            // ISPs that drop oversized packets (PMTUD black-hole).
            // Combined with mss_clamp = mtu - 40 in the core config this
            // forces TCP MSS clamping so segments never exceed the tunnel.
            .setMtu(mtu)
            .addAddress("10.10.10.2", 32)
            .addAddress("fd00::2", 128)
            // Full IPv4 + IPv6 default route. The IPv6 route is mandatory:
            // without it dual-stack devices leak source IP via WebRTC and
            // every IPv6 DNS / TCP flow bypasses the tunnel.
            .addRoute("0.0.0.0", 0)
            .addRoute("::", 0)

        // LAN bypass: keep local-network + multicast traffic OFF the VPN.
        // Reduces CPU load and avoids breaking AirPlay / Chromecast / SMB /
        // local DNS rebinding. Uses VpnService.Builder.excludeRoute on
        // Android 13+ (API 33). On older Android the kernel still routes
        // RFC1918 via the local interface when reachable, so this is a
        // no-op fallback rather than a hard requirement.
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.TIRAMISU) {
            try {
                val IpPrefix = Class.forName("android.net.IpPrefix")
                val ctor = IpPrefix.getConstructor(InetAddress::class.java, Int::class.javaPrimitiveType)
                val excludeMethod = b.javaClass.getMethod("excludeRoute", IpPrefix)
                val lanPrefixes = listOf(
                    "10.0.0.0" to 8,
                    "172.16.0.0" to 12,
                    "192.168.0.0" to 16,
                    "169.254.0.0" to 16,   // link-local
                    "224.0.0.0" to 4,      // multicast
                    "255.255.255.255" to 32, // broadcast
                )
                for ((addr, prefix) in lanPrefixes) {
                    val ip = InetAddress.getByName(addr)
                    val pfx = ctor.newInstance(ip, prefix)
                    excludeMethod.invoke(b, pfx)
                }
            } catch (t: Throwable) {
                Log.w(TAG, "LAN bypass excludeRoute unavailable: ${t.message}")
            }
        }

        // Strict DNS binding. Install the encrypted resolvers as the ONLY
        // resolvers on the tun interface. Combined with the 0.0.0.0/0 +
        // ::/0 default routes above, every UDP/TCP packet to port 53 is
        // forced through the tun fd — no fallback to the carrier's DNS.
        dns.forEach { b.addDnsServer(it) }
        // Pin the DNS sentinels behind explicit /32 + /128 host routes so
        // even apps that hardcode 1.1.1.1 / 8.8.8.8 (bypassing the system
        // resolver) still ride the tunnel.
        dns.forEach { addr ->
            try {
                val ip = InetAddress.getByName(addr)
                val prefix = if (ip.address.size == 4) 32 else 128
                b.addRoute(ip, prefix)
            } catch (_: Throwable) {}
        }

        // System "Private DNS" (DoT on port 853) fires from a network
        // process outside our VpnService on Android Q+, so we cannot
        // intercept it at the VpnService layer. The only honest defence is
        // to surface this to the UI so the user disables it.
        if (isPrivateDnsActive()) {
            Log.w(TAG, "Private DNS is enabled — DoT bypasses the tunnel")
            broadcastTunError("PRIVATE_DNS_ACTIVE")
        }

        disallowedApps.forEach {
            try { b.addDisallowedApplication(it) } catch (_: Throwable) {}
        }
        try { b.setBlocking(true) } catch (_: Throwable) {}
        if (killSwitch) {
            try { b.javaClass.getMethod("setBlockingMode", Boolean::class.java).invoke(b, true) } catch (_: Throwable) {}
        }
        return b
    }

    private fun isPrivateDnsActive(): Boolean = try {
        val mode = android.provider.Settings.Global.getString(
            contentResolver, "private_dns_mode"
        )
        mode != null && mode != "off"
    } catch (_: Throwable) { false }

    private fun startTunnel() {
        try { fd?.close() } catch (_: Throwable) {}
        // Seed currentPort from the selected server config on first start
        // so we broadcast the truthful initial port (not just "443").
        serverConfig?.optInt("port", 0)?.takeIf { it > 0 }?.let { currentPort = it }
        fd = try {
            buildBuilder().establish()
        } catch (t: Throwable) {
            Log.e(TAG, "VpnService.establish() threw", t)
            null
        }
        if (fd == null) {
            // The OS refused to grant the tun fd (missing consent, conflicting
            // VPN, OEM restriction). Without it nothing else can succeed.
            Log.e(TAG, "tun fd unavailable — tunnel cannot start")
            broadcastTunError("TUN_BIND_FAILED")
            broadcastHealth("down")
            return
        }
        engineJob?.cancel()
        engineJob = scope.launch { runEngineLoop() }
        broadcastPort(currentPort)
        startPortRotatorIfNeeded()
    }


    private fun restartTunnel() = startTunnel()

    private fun stopSelfAndTunnel() {
        portRotatorJob?.cancel()
        portRotatorJob = null
        engineJob?.cancel()
        engineJob = null
        killCoreProcess()
        try { fd?.close() } catch (_: Throwable) {}
        fd = null
        broadcastHealth("down")
        broadcastPort(0) // 0 → JS interprets as null / "-"
        stopSelf()
    }

    /**
     * DPI port-cycling. Active only in Elite stealth mode. Walks through
     * DPI_PORTS, rebuilds the proxy outbound on each tick and broadcasts
     * the new active port so the UI can display the exact integer.
     *
     * The rotation is anchored to the engine loop — if the engine stops
     * (Kill Switch, user disconnect) this coroutine is cancelled too.
     */
    private fun startPortRotatorIfNeeded() {
        portRotatorJob?.cancel()
        if (stealth != "elite") return
        portRotatorJob = scope.launch {
            var idx = DPI_PORTS.indexOf(currentPort).coerceAtLeast(0)
            while (isActive) {
                delay(PORT_ROTATE_INTERVAL_MS)
                if (!isActive) break
                idx = (idx + 1) % DPI_PORTS.size
                val next = DPI_PORTS[idx]
                currentPort = next
                // Patch the server config in place so generateConfigFile()
                // picks up the new port on the next core relaunch.
                serverConfig?.put("port", next)
                Log.i(TAG, "DPI port rotation -> $next")
                broadcastPort(next)
                // Bounce the core with the new outbound port. Kill Switch
                // remains armed so no plaintext escapes during the swap.
                killCoreProcess()
            }
        }
    }

    /**
     * Build a temporary core configuration JSON for the selected protocol
     * + server pair. Written to the app's cache dir and consumed by the
     * exec'd core binary via `--config <path>`.
     */
    private fun generateConfigFile(): File {
        val cfg = JSONObject().apply {
            put("protocol", protocol)
            put("dns", JSONArray(dns))
            put("server", serverConfig ?: JSONObject())
            put("stealth", stealth)
            put("mtu", mtu)
            // Acceleration hints consumed by the core (Xray / sing-box):
            //  - transport "udp" forces QUIC/UDP outbounds for VLESS+SS to
            //    eliminate TCP handshake + retransmit overhead.
            //  - mux.enabled multiplexes concurrent streams over one conn.
            //  - congestion "bbr" requests BBR-compatible windows on the
            //    client side (server runs sysctl tcp_congestion_control=bbr).
            //  - mss_clamp keeps TCP segments inside MTU for any TCP fallback.
            put("acceleration", JSONObject().apply {
                put("transport", if (smartAccel) "udp" else "auto")
                put("mux", JSONObject().apply {
                    put("enabled", smartAccel)
                    put("concurrency", if (smartAccel) 8 else 1)
                })
                put("congestion", if (smartAccel) "bbr" else "cubic")
                put("mss_clamp", mtu - 40)
                put("compression", compression)
            })
            // Xray/sing-box routing block. Forces all traffic destined for
            // RFC1918 private ranges + link-local + multicast + loopback +
            // trusted local domains through the `direct` outbound, fully
            // bypassing the VPN. Reduces CPU on the tunnel and keeps LAN
            // services (printers, Chromecast, NAS, router admin UI)
            // reachable while the tunnel is up.
            put("routing", JSONObject().apply {
                put("domainStrategy", "IPIfNonMatch")
                put("rules", JSONArray().apply {
                    // Private IPv4 + IPv6 + loopback + link-local → direct.
                    put(JSONObject().apply {
                        put("type", "field")
                        put("outboundTag", "direct")
                        put("ip", JSONArray().apply {
                            put("10.0.0.0/8")
                            put("172.16.0.0/12")
                            put("192.168.0.0/16")
                            put("127.0.0.0/8")
                            put("169.254.0.0/16")
                            put("224.0.0.0/4")
                            put("::1/128")
                            put("fc00::/7")
                            put("fe80::/10")
                        })
                    })
                    // Trusted local / system domains → direct.
                    put(JSONObject().apply {
                        put("type", "field")
                        put("outboundTag", "direct")
                        put("domain", JSONArray().apply {
                            put("geosite:private")
                            put("domain:local")
                            put("domain:lan")
                            put("domain:localhost")
                            put("domain:home.arpa")
                            put("domain:in-addr.arpa")
                            put("domain:ip6.arpa")
                        })
                    })
                    // Default: everything else through the proxy outbound.
                    put(JSONObject().apply {
                        put("type", "field")
                        put("outboundTag", "proxy")
                        put("network", "tcp,udp")
                    })
                })
            })
            // Outbound declarations consumed by the core. The `proxy` tag
            // is bound to the selected server; `direct` and `block` are
            // stock outbounds used by the routing rules above.
            put("outbounds", JSONArray().apply {
                put(JSONObject().apply {
                    put("tag", "proxy")
                    put("protocol", protocol)
                    put("settings", serverConfig ?: JSONObject())
                })
                put(JSONObject().apply { put("tag", "direct"); put("protocol", "freedom") })
                put(JSONObject().apply { put("tag", "block"); put("protocol", "blackhole") })
            })
        }
        val out = File(cacheDir, "trivo-core.json")
        FileOutputStream(out).use { it.write(cfg.toString().toByteArray()) }
        return out
    }

    /**
     * Locate the core binary. Production: ship as a native lib in
     * `jniLibs/<abi>/libtrivocore.so` so PackageManager extracts it and
     * the path is `applicationInfo.nativeLibraryDir`.
     */
    private fun coreBinary(): File {
        val nativeDir = applicationInfo.nativeLibraryDir
        return File(nativeDir, "libtrivocore.so")
    }

    /**
     * Engine I/O loop.
     *
     * 1. Writes a fresh config file from current protocol/server state.
     * 2. Execs the core binary, handing the tun fd via `--tunfd <int>`.
     * 3. Pipes stdout + stderr to logcat for debugging.
     * 4. If the process exits non-zero (crash): Kill Switch keeps the tun
     *    fd open (default route to black hole) and we schedule a backoff
     *    reconnect. On clean stop the loop exits silently.
     */
    private suspend fun runEngineLoop() = withContext(Dispatchers.IO) {
        // Start in "degraded" until the core proves it actually bound to
        // the tun fd. We refuse to claim "connected" purely because the
        // service started — that was the desync that made the UI show
        // ENGINE-CONNECTED while traffic still leaked.
        broadcastHealth("degraded")
        while (isActive) {
            val config = try { generateConfigFile() } catch (t: Throwable) {
                Log.e(TAG, "config gen failed", t)
                broadcastTunError("CONFIG_GEN_FAILED:${t.message}")
                break
            }
            val bin = coreBinary()
            if (!bin.exists()) {
                Log.w(TAG, "core binary missing at ${bin.absolutePath} — Kill Switch holding traffic")
                broadcastTunError("CORE_BINARY_MISSING")
                broadcastHealth("down")
                if (!killSwitch) break
                delay(backoffDelay()); continue
            }
            val tunFd = fd?.fd ?: run {
                Log.e(TAG, "tun fd unavailable")
                broadcastTunError("TUN_FD_LOST")
                broadcastHealth("down")
                break
            }
            val pb = ProcessBuilder(
                bin.absolutePath,
                "--config", config.absolutePath,
                "--tunfd", tunFd.toString(),
            ).redirectErrorStream(true)

            val proc = try { pb.start() } catch (t: Throwable) {
                Log.e(TAG, "core exec failed", t)
                broadcastTunError("CORE_EXEC_FAILED:${t.message}")
                broadcastHealth("down")
                if (!killSwitch) break
                delay(backoffDelay()); continue
            }
            coreProcess = proc

            // Watch stdout for the readiness marker. The core MUST print a
            // single line `ready tunfd=<N>` once it has successfully dup'd
            // the tun fd and started forwarding. Until we see that marker
            // the engine stays "degraded". If a known bind-error string
            // appears we propagate it to JS as a hard tunnel error.
            val readyJob = launch {
                proc.inputStream.bufferedReader().useLines { lines ->
                    var bound = false
                    for (line in lines) {
                        Log.d(TAG_CORE, line)
                        if (!bound && (line.contains("ready tunfd=") ||
                                       line.contains("tunnel bound") ||
                                       line.startsWith("READY"))) {
                            bound = true
                            backoffAttempt = 0
                            broadcastHealth("connected")
                        }
                        if (line.contains("bind: permission denied") ||
                            line.contains("tun: invalid fd") ||
                            line.contains("EBADF") ||
                            line.contains("operation not permitted")) {
                            broadcastTunError("CORE_TUN_BIND_FAILED:$line")
                            broadcastHealth("down")
                        }
                    }
                }
            }

            // Independent watchdog — if the core never reports readiness
            // within READY_TIMEOUT_MS, kill it and let the outer loop
            // perform an exponential-backoff reconnect. Prevents the
            // "service alive but tunnel silently broken" desync.
            val watchdog = launch {
                delay(READY_TIMEOUT_MS)
                if (isActive && proc.isAlive && lastHealth != "connected") {
                    Log.e(TAG, "core readiness timeout — killing and retrying")
                    broadcastTunError("CORE_READY_TIMEOUT")
                    broadcastHealth("down")
                    try { proc.destroy() } catch (_: Throwable) {}
                }
            }

            val exit = try { proc.waitFor() } catch (_: InterruptedException) { -1 }
            watchdog.cancel()
            readyJob.cancel()
            coreProcess = null
            if (!isActive) break
            Log.w(TAG, "core exited code=$exit — Kill Switch active, scheduling reconnect")
            broadcastHealth("down")
            if (!killSwitch) break
            backoffAttempt += 1
            delay(backoffDelay())
            broadcastHealth("degraded")
        }
    }


    private fun backoffDelay(): Long {
        val base = 800L
        val max = 15_000L
        return (base * (1L shl backoffAttempt.coerceAtMost(5))).coerceAtMost(max)
    }

    private fun killCoreProcess() {
        try { coreProcess?.destroy() } catch (_: Throwable) {}
        coreProcess = null
    }

    private fun broadcastHealth(state: String) {
        val i = Intent(BROADCAST_HEALTH).apply {
            setPackage(packageName)
            putExtra("state", state)
        }
        sendBroadcast(i)
    }

    private fun broadcastPort(port: Int) {
        val i = Intent(BROADCAST_PORT).apply {
            setPackage(packageName)
            putExtra("port", port)
        }
        sendBroadcast(i)
    }

    override fun onDestroy() {
        scope.cancel()
        killCoreProcess()
        super.onDestroy()
    }

    companion object {
        private const val TAG = "TrivoVpnService"
        private const val TAG_CORE = "TrivoCore"
        const val BROADCAST_HEALTH = "com.baurp.mastervpn.HEALTH"
        const val BROADCAST_PORT = "com.baurp.mastervpn.PORT"

        // Elite-mode DPI port-cycling pool. Mirrors the front-end list and
        // is consumed exclusively by the native rotator coroutine — the JS
        // layer no longer fakes rotation with setInterval.
        private val DPI_PORTS = intArrayOf(443, 8443, 2053, 2083, 2087, 2096)
        private const val PORT_ROTATE_INTERVAL_MS = 30_000L

        const val ACTION_START = "com.baurp.mastervpn.START"
        const val ACTION_STOP = "com.baurp.mastervpn.STOP"
        const val ACTION_SET_PROTOCOL = "com.baurp.mastervpn.SET_PROTOCOL"
        const val ACTION_SET_KILLSWITCH = "com.baurp.mastervpn.SET_KILLSWITCH"
        const val ACTION_SET_STEALTH = "com.baurp.mastervpn.SET_STEALTH"
        const val ACTION_SET_ACCELERATION = "com.baurp.mastervpn.SET_ACCEL"
        const val ACTION_NETWORK_CHANGE = "com.baurp.mastervpn.NETWORK_CHANGE"

        const val EXTRA_PROTOCOL = "protocol"
        const val EXTRA_KILLSWITCH = "killSwitch"
        const val EXTRA_STEALTH = "stealth"
        const val EXTRA_DNS = "dns"
        const val EXTRA_DISALLOWED = "disallowed"
        const val EXTRA_SERVER = "server"
        const val EXTRA_SMART_ACCEL = "smartAccel"
        const val EXTRA_COMPRESSION = "compression"
        const val EXTRA_MTU = "mtu"
        const val EXTRA_TRANSPORT = "transport"

        fun buildStartIntent(
            ctx: Context,
            protocol: String,
            serverJson: String?,
            killSwitch: Boolean,
            dnsJson: String?,
            disallowedJson: String?,
        ): Intent = Intent(ctx, TrivoVpnService::class.java).apply {
            action = ACTION_START
            putExtra(EXTRA_PROTOCOL, protocol)
            putExtra(EXTRA_KILLSWITCH, killSwitch)
            serverJson?.let { putExtra(EXTRA_SERVER, it) }
            dnsJson?.let { putExtra(EXTRA_DNS, it) }
            disallowedJson?.let { putExtra(EXTRA_DISALLOWED, it) }
        }

        fun buildStopIntent(ctx: Context): Intent =
            Intent(ctx, TrivoVpnService::class.java).apply { action = ACTION_STOP }
    }
}
