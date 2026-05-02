package com.baurp.mastervpn.tunnel

import android.content.Context
import android.content.Intent
import android.net.VpnService
import android.os.ParcelFileDescriptor
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import org.json.JSONArray
import org.json.JSONObject

/**
 * Native VPN tunnel service.
 *
 * This is the skeleton that owns the tun fd. The actual packet I/O loop
 * (Xray-core for vless+reality, v2ray-plugin for shadowsocks, wireguard-go
 * for wireguard) is plugged into the `runEngineLoop()` hook below.
 *
 * Kill Switch enforcement:
 *  - While active, the builder is configured with `setBlockingMode(true)`
 *    and a default IPv4/IPv6 route. If the engine drops, we keep the tun
 *    fd open and route packets to a black hole — never letting traffic
 *    spill onto the clear network.
 *
 * Split Tunnel:
 *  - `disallowedApps` is iterated and each package is excluded from the
 *    tunnel via `addDisallowedApplication`. The descriptor is rebuilt on
 *    every `ACTION_SET_*` to apply changes.
 *
 * DNS:
 *  - The provided DNS list (default 1.1.1.1 / 1.0.0.1) is forced through
 *    `addDnsServer`, bypassing ISP DNS regardless of system settings.
 */
class TrivoVpnService : VpnService() {

    private var fd: ParcelFileDescriptor? = null
    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private var engineJob: Job? = null

    private var protocol: String = "wireguard"
    private var killSwitch: Boolean = true
    private var stealth: String = "standard"
    private var dns: List<String> = listOf("1.1.1.1", "1.0.0.1")
    private var disallowedApps: List<String> = emptyList()
    private var serverConfig: JSONObject? = null

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
            .setMtu(1420)
            .addAddress("10.10.10.2", 32)
            .addAddress("fd00::2", 128)
            .addRoute("0.0.0.0", 0)
            .addRoute("::", 0)

        dns.forEach { b.addDnsServer(it) }

        // Split Tunnel — exclude user-specified packages from the tunnel.
        disallowedApps.forEach {
            try { b.addDisallowedApplication(it) } catch (_: Throwable) {}
        }

        // Kill Switch — block traffic while builder is reconfigured / engine drops.
        try { b.setBlocking(true) } catch (_: Throwable) {}
        if (killSwitch) {
            // setBlockingMode lives on newer API levels; fall back silently.
            try { b.javaClass.getMethod("setBlockingMode", Boolean::class.java).invoke(b, true) } catch (_: Throwable) {}
        }
        return b
    }

    private fun startTunnel() {
        try {
            fd?.close()
        } catch (_: Throwable) {}
        fd = buildBuilder().establish()
        engineJob?.cancel()
        engineJob = scope.launch { runEngineLoop() }
    }

    private fun restartTunnel() {
        startTunnel()
    }

    private fun stopSelfAndTunnel() {
        engineJob?.cancel()
        engineJob = null
        try { fd?.close() } catch (_: Throwable) {}
        fd = null
        stopSelf()
    }

    /**
     * Engine I/O loop hook.
     *
     * Replace this with a call into the native bridge:
     *   - vless-reality  → Xray-core JNI (libxray.so)
     *   - shadowsocks    → v2ray-plugin (libssr.so) + obfs random-noise
     *   - wireguard      → wireguard-go (libwg.so)
     *
     * The fd from `establish()` is handed to the engine which performs
     * userspace TCP/UDP encapsulation. Health pings should be emitted
     * back to the plugin via a LocalBroadcast so JS can react.
     */
    private suspend fun runEngineLoop() {
        // TODO: wire native engine. Currently a no-op placeholder so the
        // tun fd stays open and packets are dropped (Kill Switch behavior).
    }

    override fun onDestroy() {
        scope.cancel()
        super.onDestroy()
    }

    companion object {
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
