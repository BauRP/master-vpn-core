package com.baurp.mastervpn

import android.content.Intent
import com.baurp.mastervpn.ping.PingModule
import com.baurp.mastervpn.scraper.ScraperWorker
import com.baurp.mastervpn.tunnel.NetworkListener
import com.baurp.mastervpn.tunnel.TrivoVpnService
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch

/**
 * Capacitor entry point for Trivo VPN native modules.
 *
 * All long-running work (sockets, Room, WorkManager scheduling) is dispatched
 * onto Dispatchers.IO so the JS bridge thread (main) is never blocked.
 */
@CapacitorPlugin(name = "TrivoVpn")
class TrivoVpnPlugin : Plugin() {
    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private val ping = PingModule()
    private var networkListener: NetworkListener? = null

    override fun load() {
        super.load()
        // Start network classification listener — emits to JS via notifyListeners.
        networkListener = NetworkListener(context) { trust ->
            val payload = JSObject().put("trust", trust)
            notifyListeners("networkChange", payload)
        }.also { it.register() }
    }

    override fun handleOnDestroy() {
        networkListener?.unregister()
        scope.cancel()
        super.handleOnDestroy()
    }

    /* ---------------- Ping ---------------- */

    @PluginMethod
    fun tcpPing(call: PluginCall) {
        val host = call.getString("host")
        val port = call.getInt("port") ?: 443
        val timeoutMs = call.getInt("timeoutMs") ?: 2500
        if (host.isNullOrBlank()) {
            call.reject("host is required"); return
        }
        scope.launch {
            val rtt = ping.tcpConnectRtt(host, port, timeoutMs)
            val res = JSObject()
            if (rtt == null) res.put("rttMs", JSObject.NULL) else res.put("rttMs", rtt)
            call.resolve(res)
        }
    }

    @PluginMethod
    fun icmpPing(call: PluginCall) {
        val host = call.getString("host") ?: run { call.reject("host required"); return }
        val timeoutMs = call.getInt("timeoutMs") ?: 2500
        scope.launch {
            val rtt = ping.icmp(host, timeoutMs)
            val res = JSObject()
            if (rtt == null) res.put("rttMs", JSObject.NULL) else res.put("rttMs", rtt)
            call.resolve(res)
        }
    }

    /* ---------------- VPN tunnel ---------------- */

    @PluginMethod
    fun start(call: PluginCall) {
        val protocol = call.getString("protocol") ?: "wireguard"
        val server = call.getObject("server")
        val killSwitch = call.getBoolean("killSwitch") ?: true
        val dns = call.getArray("dns")
        val disallowed = call.getArray("disallowedApps")

        val intent = TrivoVpnService.buildStartIntent(
            context,
            protocol = protocol,
            serverJson = server?.toString(),
            killSwitch = killSwitch,
            dnsJson = dns?.toString(),
            disallowedJson = disallowed?.toString(),
        )

        // VpnService.prepare(...) must be triggered from the activity. The
        // plugin saves the call so the result handler can resolve once the
        // user grants the system VPN consent dialog.
        val prepare = android.net.VpnService.prepare(context)
        if (prepare != null) {
            saveCall(call)
            startActivityForResult(call, prepare, "onVpnConsent")
        } else {
            context.startService(intent)
            call.resolve(JSObject().put("started", true))
        }
    }

    @com.getcapacitor.annotation.ActivityCallback
    fun onVpnConsent(call: PluginCall, result: androidx.activity.result.ActivityResult) {
        if (result.resultCode == android.app.Activity.RESULT_OK) {
            // Re-issue start with the originally-passed args.
            val intent = TrivoVpnService.buildStartIntent(
                context,
                protocol = call.getString("protocol") ?: "wireguard",
                serverJson = call.getObject("server")?.toString(),
                killSwitch = call.getBoolean("killSwitch") ?: true,
                dnsJson = call.getArray("dns")?.toString(),
                disallowedJson = call.getArray("disallowedApps")?.toString(),
            )
            context.startService(intent)
            call.resolve(JSObject().put("started", true))
        } else {
            call.reject("VPN consent denied by user")
        }
    }

    @PluginMethod
    fun stop(call: PluginCall) {
        context.startService(TrivoVpnService.buildStopIntent(context))
        call.resolve(JSObject().put("stopped", true))
    }

    @PluginMethod
    fun setProtocol(call: PluginCall) {
        val protocol = call.getString("protocol") ?: run { call.reject("protocol required"); return }
        context.startService(
            Intent(context, TrivoVpnService::class.java).apply {
                action = TrivoVpnService.ACTION_SET_PROTOCOL
                putExtra(TrivoVpnService.EXTRA_PROTOCOL, protocol)
            }
        )
        call.resolve()
    }

    @PluginMethod
    fun setKillSwitch(call: PluginCall) {
        val enabled = call.getBoolean("enabled") ?: true
        context.startService(
            Intent(context, TrivoVpnService::class.java).apply {
                action = TrivoVpnService.ACTION_SET_KILLSWITCH
                putExtra(TrivoVpnService.EXTRA_KILLSWITCH, enabled)
            }
        )
        call.resolve()
    }

    @PluginMethod
    fun setStealthMode(call: PluginCall) {
        val mode = call.getString("mode") ?: "standard"
        context.startService(
            Intent(context, TrivoVpnService::class.java).apply {
                action = TrivoVpnService.ACTION_SET_STEALTH
                putExtra(TrivoVpnService.EXTRA_STEALTH, mode)
            }
        )
        call.resolve()
    }

    @PluginMethod
    fun setAcceleration(call: PluginCall) {
        val smart = call.getBoolean("smartAccel") ?: true
        val compression = call.getBoolean("compression") ?: false
        val mtu = call.getInt("mtu") ?: 1400
        context.startService(
            Intent(context, TrivoVpnService::class.java).apply {
                action = TrivoVpnService.ACTION_SET_ACCELERATION
                putExtra(TrivoVpnService.EXTRA_SMART_ACCEL, smart)
                putExtra(TrivoVpnService.EXTRA_COMPRESSION, compression)
                putExtra(TrivoVpnService.EXTRA_MTU, mtu)
            }
        )
        call.resolve()
    }

    /* ---------------- Scraper (WorkManager) ---------------- */

    @PluginMethod
    fun scheduleScraper(call: PluginCall) {
        val intervalMinutes = call.getInt("intervalMinutes") ?: 60
        ScraperWorker.schedule(context, intervalMinutes.toLong())
        call.resolve(JSObject().put("scheduled", true))
    }

    @PluginMethod
    fun cancelScraper(call: PluginCall) {
        ScraperWorker.cancel(context)
        call.resolve()
    }

    /* ---------------- Battery optimization ---------------- */

    @PluginMethod
    fun isIgnoringBatteryOptimizations(call: PluginCall) {
        val pm = context.getSystemService(android.content.Context.POWER_SERVICE) as android.os.PowerManager
        val ignoring = pm.isIgnoringBatteryOptimizations(context.packageName)
        call.resolve(JSObject().put("ignoring", ignoring))
    }

    @PluginMethod
    fun requestIgnoreBatteryOptimizations(call: PluginCall) {
        val intent = Intent(android.provider.Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
            data = android.net.Uri.parse("package:${context.packageName}")
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        try {
            context.startActivity(intent)
            call.resolve(JSObject().put("requested", true))
        } catch (t: Throwable) {
            call.reject("battery optimization prompt failed: ${t.message}")
        }
    }

    /* ---------------- Health bridge (called by service via broadcast) ---------------- */

    fun emitHealth(state: String) {
        notifyListeners("healthChange", JSObject().put("state", state))
    }
}
