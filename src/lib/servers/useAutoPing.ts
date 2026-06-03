/**
 * useAutoPing — silent, protocol-aware background latency probe.
 *
 * The previous implementation pinged proxy ports with a plain HTTPS
 * `fetch`. VLESS-Reality and Shadowsocks-2022 servers drop those
 * requests by design, which produced a flood of false-negative `null`
 * results — making every server look "unreachable" on hostile networks.
 *
 * The new strategy:
 *  - On native (Android, Capacitor), the Kotlin `tcpPing` performs a
 *    protocol-aware handshake — Reality TLS ClientHello (with the
 *    server's SNI) or SS-2022 salt exchange — instead of a bare TCP
 *    `connect`. This catches DPI black-holing where the socket is
 *    accepted but the application handshake is silently dropped.
 *  - On the web fallback there is no way to forge those handshakes from
 *    the browser without CORS-violating cross-origin connect, and a
 *    naked `fetch` is misleading — so we simply return `null` and let
 *    the server's last server-side `latency_ms` value (from the cloud
 *    `servers` table) drive the UI.
 *
 * Runs once shortly after mount, then on a 5-minute foreground cadence.
 * The heavy 15-minute cycle runs natively in WorkManager with Doze /
 * idle constraints to stay battery-friendly.
 */
import { useEffect, useState } from "react";
import { useServers, type ServerRow } from "./useServers";
import { TrivoVpn, isNativeTrivo } from "@/native/trivoVpn";

// Battery-friendly schedule. The native (Android) WorkManager handles
// the heavy periodic ping cycle on a 15-minute cadence with Doze + idle
// constraints; this in-app loop only refreshes while the foreground UI
// is visible, and pauses entirely when the document is hidden.
const LAUNCH_DELAY_MS = 1500;        // let the app settle first
const REFRESH_INTERVAL_MS = 5 * 60_000; // 5 minutes — foreground only
const PING_TIMEOUT_MS = 2500;        // Reality handshake is slower than TCP
const MAX_TARGETS = 25;              // cap: do not flood the network
const PARALLEL = 6;                  // concurrent probes

type PingMap = Record<string, number | null>;

let cachedPings: PingMap = {};
let cachedFastestId: string | null = null;
let listeners = new Set<() => void>();

function publish(next: PingMap) {
  cachedPings = next;
  let bestId: string | null = null;
  let bestMs = Infinity;
  for (const [id, ms] of Object.entries(next)) {
    if (ms != null && ms < bestMs) {
      bestMs = ms;
      bestId = id;
    }
  }
  cachedFastestId = bestId;
  listeners.forEach((fn) => fn());
}

/**
 * Probe a single server. On native this is a real protocol-level
 * handshake; on web it is intentionally a no-op (returns `null`) — the
 * UI falls back to the server-side `latency_ms` recorded in the cloud
 * `servers` table.
 */
async function probeOne(server: ServerRow): Promise<number | null> {
  if (!isNativeTrivo) {
    // Web fallback: a plain HTTPS GET against a proxy port produces
    // misleading null/timeout results, so we deliberately decline to
    // probe and let the server-side latency drive ordering.
    return null;
  }
  try {
    const { rttMs } = await TrivoVpn.tcpPing({
      host: server.host,
      port: server.port,
      timeoutMs: PING_TIMEOUT_MS,
      protocol: server.protocol, // protocol-aware handshake on native side
      sni: server.sni ?? undefined,
    });
    return rttMs;
  } catch {
    return null;
  }
}

async function probeAll(servers: ServerRow[]) {
  const targets = servers.slice(0, MAX_TARGETS);
  const out: PingMap = { ...cachedPings };
  // Bounded concurrency to avoid bursting many sockets at once on mobile.
  let i = 0;
  async function worker() {
    while (i < targets.length) {
      const idx = i++;
      const s = targets[idx];
      out[s.id] = await probeOne(s);
    }
  }
  await Promise.all(Array.from({ length: PARALLEL }, worker));
  publish(out);
}

/**
 * Mount once near the app root. Drives the silent, low-frequency probe
 * loop so geo-aware highlighting works without manual interaction.
 */
export function useAutoPing() {
  const { data } = useServers();

  useEffect(() => {
    const servers = data?.servers ?? [];
    if (!servers.length) return;
    let stopped = false;

    // Doze / screen-off awareness. Skip work while the page is hidden;
    // the native WorkManager scheduler covers the device-asleep case.
    const tick = () => {
      if (stopped) return;
      if (typeof document !== "undefined" && document.hidden) return;
      void probeAll(servers);
    };

    const launchTimer = setTimeout(tick, LAUNCH_DELAY_MS);
    const interval = setInterval(tick, REFRESH_INTERVAL_MS);
    const onVisible = () => { if (!document.hidden) tick(); };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      stopped = true;
      clearTimeout(launchTimer);
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [data]);
}

/** Reactive accessor: the server id with the lowest measured RTT. */
export function useFastestServerId(): string | null {
  const [, force] = useState(0);
  useEffect(() => {
    const fn = () => force((n) => n + 1);
    listeners.add(fn);
    return () => { listeners.delete(fn); };
  }, []);
  return cachedFastestId;
}

/** Reactive accessor: snapshot of the latest measured pings. */
export function useAutoPings(): PingMap {
  const [, force] = useState(0);
  useEffect(() => {
    const fn = () => force((n) => n + 1);
    listeners.add(fn);
    return () => { listeners.delete(fn); };
  }, []);
  return cachedPings;
}
