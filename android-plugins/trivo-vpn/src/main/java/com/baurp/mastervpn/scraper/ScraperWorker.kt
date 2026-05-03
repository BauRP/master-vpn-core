package com.baurp.mastervpn.scraper

import android.content.Context
import androidx.work.Constraints
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.NetworkType
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import com.baurp.mastervpn.ping.PingModule
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.withContext
import org.json.JSONArray
import java.net.HttpURLConnection
import java.net.URL
import java.security.MessageDigest
import java.util.concurrent.TimeUnit

/**
 * Periodic scraper.
 *
 * Pulls free-server feeds (Iran, APAC, US Digital Freedom Foundation),
 * parses VLESS / Shadowsocks URIs, validates each via TCP-connect ping
 * (PingModule), then upserts into Room. Stale rows older than 6h are
 * removed so the active pool stays fresh.
 *
 * Threading: every step runs on Dispatchers.IO. Concurrency-bounded
 * validation prevents kicking 300 sockets at once on flaky networks.
 */
class ScraperWorker(ctx: Context, params: WorkerParameters) : CoroutineWorker(ctx, params) {

    private val ping = PingModule()

    override suspend fun doWork(): Result = withContext(Dispatchers.IO) {
        try {
            val raw = SOURCES.flatMap { fetch(it) }
            val parsed = raw.mapNotNull(::parseUri).distinctBy { "${it.host}:${it.port}:${it.protocol}" }

            // Validate at most 32 concurrently. Surface the result back
            // through Room so the UI list (DiffUtil) updates smoothly.
            val validated = coroutineScope {
                parsed.chunked(32).flatMap { chunk ->
                    chunk.map { row ->
                        async {
                            val rtt = ping.tcpConnectRtt(row.host, row.port, 2500)
                            row.copy(latencyMs = rtt, isAlive = rtt != null, lastSeen = System.currentTimeMillis())
                        }
                    }.map { it.await() }
                }
            }

            val db = ServersDb.get(applicationContext).servers()
            db.upsert(validated)
            // Cleanup: anything not seen in the last 6 hours.
            val cutoff = System.currentTimeMillis() - TimeUnit.HOURS.toMillis(6)
            db.deleteStale(cutoff)
            Result.success()
        } catch (_: Throwable) {
            Result.retry()
        }
    }

    private suspend fun fetch(url: String): List<String> = withContext(Dispatchers.IO) {
        try {
            val conn = (URL(url).openConnection() as HttpURLConnection).apply {
                connectTimeout = 5000
                readTimeout = 7000
                requestMethod = "GET"
                setRequestProperty("Accept", "application/json,text/plain,*/*")
            }
            val body = conn.inputStream.bufferedReader().use { it.readText() }
            // Accept either newline-delimited URIs or a JSON array of strings.
            if (body.trim().startsWith("[")) {
                val arr = JSONArray(body)
                (0 until arr.length()).mapNotNull { runCatching { arr.getString(it) }.getOrNull() }
            } else {
                body.split('\n').map { it.trim() }.filter { it.isNotBlank() }
            }
        } catch (_: Throwable) { emptyList() }
    }

    private fun parseUri(uri: String): ServerEntity? {
        return try {
            when {
                uri.startsWith("vless://") -> parseVless(uri)
                uri.startsWith("ss://") -> parseShadowsocks(uri)
                else -> null
            }
        } catch (_: Throwable) { null }
    }

    private fun parseVless(uri: String): ServerEntity {
        // vless://uuid@host:port?params#name
        val rest = uri.removePrefix("vless://")
        val atIdx = rest.indexOf('@')
        val hostPart = rest.substring(atIdx + 1).substringBefore('?').substringBefore('#')
        val host = hostPart.substringBefore(':')
        val port = hostPart.substringAfter(':').toIntOrNull() ?: 443
        return ServerEntity(
            id = sha1("$host:$port:vless"),
            protocol = "vless", host = host, port = port, config = uri,
            countryCode = null, countryName = null, city = null, flag = null,
            source = "scraped", isAlive = false, latencyMs = null,
            lastSeen = System.currentTimeMillis(),
        )
    }

    private fun parseShadowsocks(uri: String): ServerEntity {
        val rest = uri.removePrefix("ss://").substringBefore('#')
        val hostPart = rest.substringAfter('@', missingDelimiterValue = rest)
        val host = hostPart.substringBefore(':')
        val port = hostPart.substringAfter(':').substringBefore('/').toIntOrNull() ?: 443
        return ServerEntity(
            id = sha1("$host:$port:shadowsocks"),
            protocol = "shadowsocks", host = host, port = port, config = uri,
            countryCode = null, countryName = null, city = null, flag = null,
            source = "scraped", isAlive = false, latencyMs = null,
            lastSeen = System.currentTimeMillis(),
        )
    }

    private fun sha1(s: String): String {
        val md = MessageDigest.getInstance("SHA-1")
        return md.digest(s.toByteArray()).joinToString("") { "%02x".format(it) }
    }

    companion object {
        private const val WORK_NAME = "trivo-scraper"

        // Curated public subscription feeds. Mirrors are rotated so a
        // single CDN takedown does not starve the pool. Replace / extend
        // with your own trusted sources for production.
        private val SOURCES = listOf(
            // Iran censorship-resistant aggregations
            "https://raw.githubusercontent.com/freefq/free/master/v2",
            "https://raw.githubusercontent.com/mahdibland/V2RayAggregator/master/sub/sub_merge.txt",
            // Asia-Pacific (V) pool
            "https://raw.githubusercontent.com/Pawdroid/Free-servers/main/sub",
            "https://raw.githubusercontent.com/aiboboxx/v2rayfree/main/v2",
            // US Digital Freedom Foundation mirrors
            "https://raw.githubusercontent.com/Barabama/FreeNodes/main/nodes/nodefree.txt",
            "https://raw.githubusercontent.com/ripaojiedian/freenode/main/sub",
        )

        fun schedule(ctx: Context, intervalMinutes: Long) {
            val req = PeriodicWorkRequestBuilder<ScraperWorker>(intervalMinutes, TimeUnit.MINUTES)
                .setConstraints(
                    Constraints.Builder()
                        .setRequiredNetworkType(NetworkType.CONNECTED)
                        .build()
                )
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
