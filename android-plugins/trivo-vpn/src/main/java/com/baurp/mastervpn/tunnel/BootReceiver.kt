package com.baurp.mastervpn.tunnel

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import com.baurp.mastervpn.ping.PingWorker

/**
 * BOOT_COMPLETED receiver.
 *
 * Honours the user's "Auto-connect on boot" preference (stored in the
 * `trivo.security` SharedPreferences as `autoConnectOnBoot`). When set,
 * we re-arm the WorkManager probe schedule and — if a last-known good
 * server is cached — issue a fresh start intent to TrivoVpnService.
 *
 * No-op when the preference is off, so users who never enabled it pay
 * zero boot-time cost.
 *
 * Manifest:
 *   <receiver android:name=".tunnel.BootReceiver" android:exported="true">
 *       <intent-filter>
 *           <action android:name="android.intent.action.BOOT_COMPLETED" />
 *           <action android:name="android.intent.action.QUICKBOOT_POWERON" />
 *       </intent-filter>
 *   </receiver>
 *   <uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />
 */
class BootReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        val action = intent.action ?: return
        if (action != Intent.ACTION_BOOT_COMPLETED &&
            action != "android.intent.action.QUICKBOOT_POWERON"
        ) return

        val prefs: SharedPreferences =
            context.getSharedPreferences("trivo.security", Context.MODE_PRIVATE)
        val autoConnect = prefs.getBoolean("autoConnectOnBoot", false)

        // Always keep the battery-friendly ping schedule armed so the
        // server pool has fresh latency numbers as soon as the user
        // opens the app.
        PingWorker.schedule(context)

        if (!autoConnect) return

        val serverJson = prefs.getString("lastServerJson", null)
        val protocol = prefs.getString("lastProtocol", "vless-reality") ?: "vless-reality"
        val killSwitch = prefs.getBoolean("killSwitch", true)

        val startIntent = TrivoVpnService.buildStartIntent(
            context,
            protocol = protocol,
            serverJson = serverJson,
            killSwitch = killSwitch,
            dnsJson = null,
            disallowedJson = null,
        )
        // The framework allows starting a foreground VPN service from
        // BOOT_COMPLETED; the consent dialog has already been granted
        // during the user's first manual connect.
        context.startForegroundService(startIntent)
    }
}
