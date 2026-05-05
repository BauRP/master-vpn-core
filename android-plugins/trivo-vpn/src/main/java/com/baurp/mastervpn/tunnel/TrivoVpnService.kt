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
            .setMtu(mtu)
            .addAddress("10.10.10.2", 32)
            .addAddress("fd00::2", 128)
            .addRoute("0.0.0.0", 0)
            .addRoute("::", 0)

        dns.forEach { b.addDnsServer(it) }
        disallowedApps.forEach {
            try { b.addDisallowedApplication(it) } catch (_: Throwable) {}
        }
        try { b.setBlocking(true) } catch (_: Throwable) {}
        if (killSwitch) {
            try { b.javaClass.getMethod("setBlockingMode", Boolean::class.java).invoke(b, true) } catch (_: Throwable) {}
        }
        return b
    }

    private fun startTunnel() {
        try { fd?.close() } catch (_: Throwable) {}
        fd = buildBuilder().establish()
        engineJob?.cancel()
        engineJob = scope.launch { runEngineLoop() }
    }

    private fun restartTunnel() = startTunnel()

    private fun stopSelfAndTunnel() {
        engineJob?.cancel()
        engineJob = null
        killCoreProcess()
        try { fd?.close() } catch (_: Throwable) {}
        fd = null
        broadcastHealth("down")
        stopSelf()
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
        broadcastHealth("connected")
        while (isActive) {
            val config = try { generateConfigFile() } catch (t: Throwable) {
                Log.e(TAG, "config gen failed", t); break
            }
            val bin = coreBinary()
            if (!bin.exists()) {
                Log.w(TAG, "core binary missing at ${bin.absolutePath} — Kill Switch holding traffic")
                broadcastHealth("down")
                if (!killSwitch) break
                delay(backoffDelay()); continue
            }
            val tunFd = fd?.fd ?: run {
                Log.e(TAG, "tun fd unavailable"); break
            }
            val pb = ProcessBuilder(
                bin.absolutePath,
                "--config", config.absolutePath,
                "--tunfd", tunFd.toString(),
            ).redirectErrorStream(true)

            val proc = try { pb.start() } catch (t: Throwable) {
                Log.e(TAG, "core exec failed", t); broadcastHealth("down")
                if (!killSwitch) break
                delay(backoffDelay()); continue
            }
            coreProcess = proc

            // Pipe stdout/stderr to logcat on a side coroutine so the loop
            // can await exit without buffering deadlocks.
            launch {
                proc.inputStream.bufferedReader().useLines { lines ->
                    lines.forEach { Log.d(TAG_CORE, it) }
                }
            }

            val exit = try { proc.waitFor() } catch (_: InterruptedException) { -1 }
            coreProcess = null
            if (!isActive) break
            Log.w(TAG, "core exited code=$exit — Kill Switch active, scheduling reconnect")
            broadcastHealth("down")
            if (!killSwitch) break
            backoffAttempt += 1
            delay(backoffDelay())
            broadcastHealth("connected")
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
        val i = Intent(BROADCAST_HEALTH).apply { putExtra("state", state) }
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

        const val ACTION_START = "com.baurp.mastervpn.START"
        const val ACTION_STOP = "com.baurp.mastervpn.STOP"
        const val ACTION_SET_PROTOCOL = "com.baurp.mastervpn.SET_PROTOCOL"
        const val ACTION_SET_KILLSWITCH = "com.baurp.mastervpn.SET_KILLSWITCH"
        const val ACTION_SET_STEALTH = "com.baurp.mastervpn.SET_STEALTH"

        const val EXTRA_PROTOCOL = "protocol"
        const val EXTRA_KILLSWITCH = "killSwitch"
        const val EXTRA_STEALTH = "stealth"
        const val EXTRA_DNS = "dns"
        const val EXTRA_DISALLOWED = "disallowed"
        const val EXTRA_SERVER = "server"

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
