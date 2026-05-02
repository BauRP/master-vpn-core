package com.baurp.mastervpn.tunnel

import android.content.Context
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.net.NetworkRequest
import android.net.wifi.WifiManager

/**
 * Classifies the active network and emits trust changes to the plugin.
 *
 *  - "trusted":   user-marked SSID (read from SharedPreferences in real impl).
 *  - "untrusted": Wi-Fi not in the trusted list, or any cellular / unknown.
 *  - "offline":   no network available.
 *
 * Hooked to ConnectivityManager.NetworkCallback so changes are pushed
 * to JS via the plugin's `networkChange` listener — no polling.
 */
class NetworkListener(
    private val context: Context,
    private val onChange: (trust: String) -> Unit,
) {
    private val cm by lazy {
        context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
    }
    private var callback: ConnectivityManager.NetworkCallback? = null

    fun register() {
        val req = NetworkRequest.Builder()
            .addCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
            .build()
        val cb = object : ConnectivityManager.NetworkCallback() {
            override fun onAvailable(network: Network) = emit(network)
            override fun onCapabilitiesChanged(network: Network, caps: NetworkCapabilities) = emit(network, caps)
            override fun onLost(network: Network) { onChange("offline") }
        }
        callback = cb
        cm.registerNetworkCallback(req, cb)
    }

    fun unregister() {
        callback?.let { try { cm.unregisterNetworkCallback(it) } catch (_: Throwable) {} }
        callback = null
    }

    private fun emit(network: Network, caps: NetworkCapabilities? = null) {
        val c = caps ?: cm.getNetworkCapabilities(network) ?: return
        val isWifi = c.hasTransport(NetworkCapabilities.TRANSPORT_WIFI)
        val ssid = if (isWifi) currentSsid() else null
        val trusted = ssid != null && isTrustedSsid(ssid)
        onChange(if (trusted) "trusted" else "untrusted")
    }

    private fun currentSsid(): String? {
        return try {
            @Suppress("DEPRECATION")
            val wm = context.applicationContext.getSystemService(Context.WIFI_SERVICE) as WifiManager
            wm.connectionInfo?.ssid?.removeSurrounding("\"")
        } catch (_: Throwable) { null }
    }

    private fun isTrustedSsid(ssid: String): Boolean {
        val prefs = context.getSharedPreferences("trivo.security", Context.MODE_PRIVATE)
        val raw = prefs.getStringSet("trustedSsids", emptySet()) ?: emptySet()
        return raw.contains(ssid)
    }
}
