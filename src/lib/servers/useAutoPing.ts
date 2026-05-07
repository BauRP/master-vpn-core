/**
 * useAutoPing — silent background latency probe.
 *
 * Runs once on app launch (mount) plus on a slow interval (60s) to keep
 * the "Optimal (Fastest)" highlight fresh without burning battery.
 *
 *  - Native: real TCP-connect RTT via the Capacitor plugin (Kotlin
 *    PingModule on Dispatchers.IO).
 *  - Web: HTTPS HEAD with timeout — best-effort, may return null.
 *
 * Result is exposed via `useFastestServerId()` and consumed by the
 * dashboard + ServerSheet to render the "Оптимальный (Самый быстрый)"
 * badge based on the user's geographic position (lowest RTT wins).
 */
import { useEffect, useState } from "react";
import { useServers, type ServerRow } from "./useServers";
import { TrivoVpn, isNativeTrivo } from "@/native/trivoVpn";

const LAUNCH_DELAY_MS = 1500;       // let the app settle first
const REFRESH_INTERVAL_MS = 60_000; // 1 minute — battery-friendly
const PING_TIMEOUT_MS = 2000;
const MAX_TARGETS = 25;             // cap: do not flood the network
const PARALLEL = 6;                 // concurrent probes

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

async function probeOne(host: string, port: number): Promise<number | null> {
  if (isNativeTrivo) {
    try {
      const { rttMs } = await TrivoVpn.tcpPing({ host, port, timeoutMs: PING_TIMEOUT_MS });
      return rttMs;
    } catch {
      return null;
    }
  }
  const start = performance.now();
  try {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), PING_TIMEOUT_MS);
    await fetch(`https://${host}:${port}/`, { mode: "no-cors", cache: "no-store", signal: ctl.signal });
    clearTimeout(timer);
    return Math.round(performance.now() - start);
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
      out[s.id] = await probeOne(s.host, s.port);
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

    const launchTimer = setTimeout(() => {
      if (!stopped) void probeAll(servers);
    }, LAUNCH_DELAY_MS);

    const interval = setInterval(() => {
      if (!stopped) void probeAll(servers);
    }, REFRESH_INTERVAL_MS);

    return () => {
      stopped = true;
      clearTimeout(launchTimer);
      clearInterval(interval);
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
