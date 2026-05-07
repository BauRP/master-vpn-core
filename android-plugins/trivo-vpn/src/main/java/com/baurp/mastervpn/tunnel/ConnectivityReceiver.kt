package com.baurp.mastervpn.tunnel

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.net.ConnectivityManager
import android.net.NetworkCapabilities

/**
 * Connectivity transition handler.
 *
 * Listens for ConnectivityManager.CONNECTIVITY_ACTION (Wi-Fi <-> cellular
 * transitions). When the underlying transport changes while the tunnel
 * is up, we ask TrivoVpnService to re-verify the optimal server (a
 * sub-50ms operation against the cached PingModule results) and rebuild
 * the tun fd against the new physical interface — without dropping the
 * Kill Switch, so traffic is never leaked during the swap.
 *
 * Manifest:
 *   <receiver android:name=".tunnel.ConnectivityReceiver" android:exported="true">
 *       <intent-filter>
 *           <action android:name="android.net.conn.CONNECTIVITY_CHANGE" />
 *       </intent-filter>
 *   </receiver>
 */
class ConnectivityReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != ConnectivityManager.CONNECTIVITY_ACTION) return

        val cm = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        val active = cm.activeNetwork ?: return
        val caps = cm.getNetworkCapabilities(active) ?: return

        val transport = when {
            caps.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) -> "wifi"
            caps.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR) -> "cellular"
            caps.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET) -> "ethernet"
            else -> "other"
        }

        // Trigger the service-side reroute. The service:
        //   1. picks the lowest-RTT server from PingModule's cache,
        //   2. preserves Kill Switch (no leak window),
        //   3. tears down + rebuilds the tun fd against the new transport.
        val reroute = Intent(context, TrivoVpnService::class.java).apply {
            action = TrivoVpnService.ACTION_NETWORK_CHANGE
            putExtra(TrivoVpnService.EXTRA_TRANSPORT, transport)
        }
        try {
            context.startService(reroute)
        } catch (_: Throwable) {
            // Service not running — nothing to reroute.
        }
    }
}
