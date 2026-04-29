/**
 * VPN Engine adapter.
 *
 * Seam between the global VPN context and the actual tunnel implementation
 * (Capacitor plugin, native bridge, WebSocket health endpoint, etc.).
 *
 * Responsibilities:
 *  - Expose a subscribable `health` state ("connected" | "degraded" | "down")
 *    that any UI can read (e.g. the global "Engine" pill in the header).
 *  - Run a pluggable health-check loop. Health is debounced: a single slow
 *    or failed probe will NOT flip the engine — it requires N consecutive
 *    failures, so transient latency does not cause spurious reconnects.
 *  - Emit `onDisconnect` ONLY when health crosses from healthy -> down,
 *    and `onReconnect` ONLY when health recovers from down -> connected.
 *
 * Replace `defaultProbe` with the real plugin / WebSocket health signal
 * when wiring the production engine. VpnContext does not need to change.
 */

export type EngineHealth = "connected" | "degraded" | "down";

/**
 * Network classification reported by the platform listener.
 *  - "trusted":   user-marked safe (e.g. home Wi-Fi). VPN may stay off.
 *  - "untrusted": public Wi-Fi / cellular / unknown SSID — Auto-Protect
 *                 must initiate a handshake.
 *  - "offline":   no network. The engine pauses health probes.
 */
export type NetworkTrust = "trusted" | "untrusted" | "offline";

/**
 * Tunnel protocol exposed to the UI.
 *  - "vless-reality": XTLS-Reality handshake mimicking authorized HTTPS
 *                     (default for Premium / Elite Stealth Mode).
 *  - "shadowsocks":   v2ray-plugin random-noise fallback for statistical DPI.
 *  - "wireguard":     Standard high-perf protocol — no DPI bypass.
 */
export type VpnProtocol = "vless-reality" | "shadowsocks" | "wireguard";

/**
 * High-level mode the user picks in the UI.
 *  - "standard": WireGuard, no obfuscation. Free tier.
 *  - "elite":    Reality + TLS fragmentation + DoH. Premium only.
 */
export type StealthMode = "standard" | "elite";

export type VpnEngineHandlers = {
  /** Fired when the underlying tunnel actually drops (debounced). */
  onDisconnect: () => void;
  /** Fired when the underlying tunnel actually re-establishes. */
  onReconnect: () => void;
  /**
   * Fired when the platform reports a network change.
   * Real impl: Android `ConnectivityManager.NetworkCallback` →
   *            `onAvailable` / `onLost` / SSID inspection.
   */
  onNetworkChange?: (trust: NetworkTrust) => void;
};

/**
 * Native engine contract.
 *
 * The web prototype uses a no-op mock implementation. A real Android
 * implementation (Capacitor plugin wrapping `android.net.VpnService`)
 * MUST implement every method on this interface:
 *
 *  - `setKillSwitch(on)` →
 *      `VpnService.Builder.setBlockingMode(true)` while tunnel is up;
 *      on tunnel drop, keep the tun fd open with a default route so the
 *      OS routes packets into a black hole — no fallback to clear net.
 *
 *  - `setDisallowedApps(packages)` →
 *      iterate and call `VpnService.Builder.addDisallowedApplication(pkg)`
 *      while building the tunnel descriptor. Must rebuild on change.
 *
 *  - `setDnsServers(servers)` →
 *      `VpnService.Builder.addDnsServer(addr)` for each entry. Defaults
 *      to Cloudflare 1.1.1.1 / 1.0.0.1 to bypass ISP DNS.
 *
 *  - Network listener: register a `ConnectivityManager.NetworkCallback`
 *      and forward classified events through `onNetworkChange`.
 */
export type VpnEngine = {
  /** Subscribe to lifecycle events. Returns an unsubscribe fn. */
  subscribe: (handlers: VpnEngineHandlers) => () => void;
  /** Subscribe to health state changes. Returns an unsubscribe fn. */
  subscribeHealth: (cb: (h: EngineHealth) => void) => () => void;
  /** Read current health synchronously (for SSR / first paint). */
  getHealth: () => EngineHealth;
  /** Start the health-check loop. Called by VpnContext on mount. */
  start: () => void;
  /** Stop the health-check loop. Called by VpnContext on unmount. */
  stop: () => void;
  /** Toggle Kill Switch enforcement at the OS level (no-op in mock). */
  setKillSwitch: (on: boolean) => void;
  /** Apply Split Tunnel exclusions (package names). No-op in mock. */
  setDisallowedApps: (packages: string[]) => void;
  /** Force tunnel DNS resolvers (e.g. ["1.1.1.1","1.0.0.1"]). */
  setDnsServers: (servers: string[]) => void;
  /**
   * Select the active wire protocol. Real Android engine swaps the
   * Xray-core outbound (vless+reality / shadowsocks+v2ray-plugin /
   * wireguard-go) and re-establishes the tunnel.
   */
  setProtocol: (protocol: VpnProtocol) => void;
  /**
   * Toggle Elite Stealth Mode. When ON the engine MUST:
   *  - default to vless-reality
   *  - enable TLS ClientHello fragmentation (defeats SNI-based DPI)
   *  - force DNS-over-HTTPS for all queries
   *  - enable Cloudflare CDN routing as fallback if direct IP is blocked
   */
  setStealthMode: (mode: StealthMode) => void;
  /**
   * Web-prototype helper: emit a fake network-change event so the
   * Auto-Protect flow can be tested without a real ConnectivityManager.
   * Real engine ignores this — events come from the OS.
   */
  simulateNetworkChange: (trust: NetworkTrust) => void;
};

/* -------------------------------------------------------------------------- */
/* Health-check tuning                                                         */
/* -------------------------------------------------------------------------- */

const PROBE_INTERVAL_MS = 5000;
const PROBE_TIMEOUT_MS = 2500;
/** Consecutive failures required before flipping to "down" + onDisconnect. */
const FAIL_THRESHOLD = 3;
/** A single success while degraded/down restores health. */
const RECOVERY_THRESHOLD = 1;

/* -------------------------------------------------------------------------- */
/* Probe                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Default probe: always succeeds. Replace with the real signal:
 *   - For a Capacitor plugin: `await VpnPlugin.ping()` returning ok/false.
 *   - For a WebSocket: send a ping frame and resolve true on pong within
 *     PROBE_TIMEOUT_MS, false otherwise.
 *   - For an HTTP health endpoint: `fetch('/healthz', { signal })` and
 *     resolve `res.ok`.
 *
 * The probe MUST resolve to a boolean and MUST respect the AbortSignal so
 * the loop can cancel a probe that exceeds PROBE_TIMEOUT_MS — this is what
 * lets us distinguish "transient latency" (one slow probe) from "real
 * disconnect" (N consecutive failures).
 */
type Probe = (signal: AbortSignal) => Promise<boolean>;

const defaultProbe: Probe = async () => true;

/* -------------------------------------------------------------------------- */
/* Engine factory                                                              */
/* -------------------------------------------------------------------------- */

function createEngine(probe: Probe): VpnEngine {
  let health: EngineHealth = "connected";
  let consecutiveFails = 0;
  let consecutiveOks = 0;
  let timer: ReturnType<typeof setInterval> | null = null;
  let inFlight: AbortController | null = null;
  let started = false;

  const handlers = new Set<VpnEngineHandlers>();
  const healthSubs = new Set<(h: EngineHealth) => void>();

  const setHealth = (next: EngineHealth) => {
    if (next === health) return;
    const prev = health;
    health = next;
    healthSubs.forEach((cb) => cb(next));

    // Edge-triggered lifecycle events. Only fire on healthy<->down crossings,
    // never on "degraded" — degraded is an intermediate warning state.
    if (next === "down" && prev !== "down") {
      handlers.forEach((h) => h.onDisconnect());
    } else if (prev === "down" && next === "connected") {
      handlers.forEach((h) => h.onReconnect());
    }
  };

  const runProbe = async () => {
    // Cancel any probe still in flight from the previous tick.
    if (inFlight) inFlight.abort();
    const ctl = new AbortController();
    inFlight = ctl;
    const timeout = setTimeout(() => ctl.abort(), PROBE_TIMEOUT_MS);

    let ok = false;
    try {
      ok = await probe(ctl.signal);
    } catch {
      ok = false;
    } finally {
      clearTimeout(timeout);
      if (inFlight === ctl) inFlight = null;
    }

    if (ok) {
      consecutiveFails = 0;
      consecutiveOks += 1;
      // Recovery only flips back to connected after RECOVERY_THRESHOLD.
      if (health !== "connected" && consecutiveOks >= RECOVERY_THRESHOLD) {
        setHealth("connected");
      }
    } else {
      consecutiveOks = 0;
      consecutiveFails += 1;
      if (consecutiveFails >= FAIL_THRESHOLD) {
        setHealth("down");
      } else if (health === "connected") {
        // First failure: surface "degraded" so the UI can warn the user
        // without triggering reconnect. Transient latency stays here.
        setHealth("degraded");
      }
    }
  };

  return {
    subscribe(h) {
      handlers.add(h);
      return () => {
        handlers.delete(h);
      };
    },
    subscribeHealth(cb) {
      healthSubs.add(cb);
      return () => {
        healthSubs.delete(cb);
      };
    },
    getHealth() {
      return health;
    },
    start() {
      if (started) return;
      started = true;
      // Kick off immediately so the first reading is fresh, then poll.
      void runProbe();
      timer = setInterval(runProbe, PROBE_INTERVAL_MS);
    },
    stop() {
      started = false;
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
      if (inFlight) {
        inFlight.abort();
        inFlight = null;
      }
    },
    /* ---------- Native contract — mock no-ops ----------
     * In the web prototype these only log so the integration surface
     * is visible during development. The real Android engine wires
     * each call into VpnService.Builder / ConnectivityManager.
     */
    setKillSwitch(on) {
      if (typeof console !== "undefined") {
        console.debug("[vpnEngine] setKillSwitch", on);
      }
    },
    setDisallowedApps(packages) {
      if (typeof console !== "undefined") {
        console.debug("[vpnEngine] setDisallowedApps", packages);
      }
    },
    setDnsServers(servers) {
      if (typeof console !== "undefined") {
        console.debug("[vpnEngine] setDnsServers", servers);
      }
    },
    setProtocol(protocol) {
      if (typeof console !== "undefined") {
        console.debug("[vpnEngine] setProtocol", protocol);
      }
    },
    setStealthMode(mode) {
      if (typeof console !== "undefined") {
        console.debug("[vpnEngine] setStealthMode", mode);
      }
    },
    simulateNetworkChange(trust) {
      handlers.forEach((h) => h.onNetworkChange?.(trust));
    },
  };
}

/**
 * Active engine used by VpnContext. Swap `defaultProbe` for the real
 * Capacitor plugin / WebSocket / HTTP health check when wiring the
 * production engine. Nothing else in the app needs to change.
 */
export const vpnEngine: VpnEngine = createEngine(defaultProbe);

/* -------------------------------------------------------------------------- */
/* React hook for live health state                                            */
/* -------------------------------------------------------------------------- */

import { useSyncExternalStore } from "react";

/** Live engine health. Re-renders the component on every health change. */
export function useEngineHealth(): EngineHealth {
  return useSyncExternalStore(
    (cb) => vpnEngine.subscribeHealth(cb),
    () => vpnEngine.getHealth(),
    () => vpnEngine.getHealth(),
  );
}
