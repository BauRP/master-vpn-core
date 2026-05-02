package com.baurp.mastervpn.ping

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.coroutines.withTimeoutOrNull
import java.net.InetAddress
import java.net.InetSocketAddress
import java.net.Socket

/**
 * Real ping module.
 *
 *  - `tcpConnectRtt`: measures the time to complete a TCP handshake to
 *    `host:port`. This is what we use as "ping" in the server sheet,
 *    because it reflects actual VPN-port reachability instead of HTTP RTT.
 *  - `icmp`: standard ICMP echo via `InetAddress.isReachable`. May fail
 *    on networks that block ICMP — TCP is the primary signal.
 *
 * Both functions:
 *  - Run on Dispatchers.IO. Caller does not need to switch contexts.
 *  - Return null on timeout / failure (never throw).
 *  - Use a coroutine timeout so a single hung host cannot stall the loop.
 */
class PingModule {

    suspend fun tcpConnectRtt(host: String, port: Int, timeoutMs: Int): Long? =
        withContext(Dispatchers.IO) {
            withTimeoutOrNull(timeoutMs.toLong()) {
                val socket = Socket()
                try {
                    val addr = InetSocketAddress(host, port)
                    val start = System.nanoTime()
                    socket.connect(addr, timeoutMs)
                    val elapsedNs = System.nanoTime() - start
                    elapsedNs / 1_000_000L
                } catch (_: Throwable) {
                    null
                } finally {
                    try { socket.close() } catch (_: Throwable) {}
                }
            }
        }

    suspend fun icmp(host: String, timeoutMs: Int): Long? =
        withContext(Dispatchers.IO) {
            withTimeoutOrNull(timeoutMs.toLong()) {
                try {
                    val addr = InetAddress.getByName(host)
                    val start = System.nanoTime()
                    val ok = addr.isReachable(timeoutMs)
                    if (!ok) return@withTimeoutOrNull null
                    (System.nanoTime() - start) / 1_000_000L
                } catch (_: Throwable) {
                    null
                }
            }
        }
}
