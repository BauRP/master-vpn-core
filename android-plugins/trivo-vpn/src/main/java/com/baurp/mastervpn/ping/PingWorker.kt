package com.baurp.mastervpn.ping

import android.content.Context
import android.os.PowerManager
import androidx.work.Constraints
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.NetworkType
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import com.baurp.mastervpn.scraper.ServersDb
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.withContext
import java.util.concurrent.TimeUnit

/**
 * Battery-friendly periodic latency probe.
 *
 * Replaces the previous 60-second background thread. Scheduled through
 * WorkManager so the OS can:
 *   - coalesce work with other deferrable jobs
 *   - skip execution while the device is in Doze / idle
 *   - require an unmetered or connected network before running
 *
 * Screen-state awareness: when the screen is off (Doze) we early-out
 * without opening any sockets, deferring the next probe to the next
 * WorkManager wake-up window. This keeps wake-locks at zero in idle.
 */
class PingWorker(ctx: Context, params: WorkerParameters) : CoroutineWorker(ctx, params) {

    private val ping = PingModule()

    override suspend fun doWork(): Result = withContext(Dispatchers.IO) {
        // Doze / screen-off guard. Non-essential pinging is skipped to
        // honour Android's battery-optimization contract.
        val pm = applicationContext.getSystemService(Context.POWER_SERVICE) as PowerManager
        if (!pm.isInteractive || pm.isDeviceIdleMode) {
            return@withContext Result.success()
        }

        try {
            val dao = ServersDb.get(applicationContext).servers()
            val targets = dao.listAlive().take(MAX_TARGETS)
            if (targets.isEmpty()) return@withContext Result.success()

            val updated = coroutineScope {
                targets.chunked(8).flatMap { chunk ->
                    chunk.map { row ->
                        async {
                            val rtt = ping.tcpConnectRtt(row.host, row.port, 1500)
                            row.copy(
                                latencyMs = rtt,
                                isAlive = rtt != null,
                                lastSeen = System.currentTimeMillis(),
                            )
                        }
                    }.map { it.await() }
                }
            }
            dao.upsert(updated)
            Result.success()
        } catch (_: Throwable) {
            Result.retry()
        }
    }

    companion object {
        const val WORK_NAME = "trivo-ping"
        private const val MAX_TARGETS = 24

        /**
         * 15 minutes is the *minimum* periodic interval allowed by
         * WorkManager — anything smaller is silently clamped. This is
         * also the recommended cadence for background latency hints
         * under Doze, App Standby, and Battery Saver.
         */
        fun schedule(ctx: Context) {
            val constraints = Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .setRequiresBatteryNotLow(true)
                .build()
            val req = PeriodicWorkRequestBuilder<PingWorker>(15, TimeUnit.MINUTES)
                .setConstraints(constraints)
                .build()
            WorkManager.getInstance(ctx).enqueueUniquePeriodicWork(
                WORK_NAME, ExistingPeriodicWorkPolicy.UPDATE, req,
            )
        }

        fun cancel(ctx: Context) {
            WorkManager.getInstance(ctx).cancelUniqueWork(WORK_NAME)
        }
    }
}
