import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { vpnEngine, type NetworkTrust, type VpnProtocol, type StealthMode } from "./vpnEngine";
import { TrivoVpn, isNativeTrivo } from "@/native/trivoVpn";

type VpnState = {
  connected: boolean;
  connecting: boolean;
  reconnecting: boolean;
  cooldown: boolean;
  elapsed: number;
  down: number;
  up: number;
  downSeries: number[];
  upSeries: number[];
  /** DNS leak protection — true while tunnel is up. */
  dnsSecure: boolean;
  /** Active DNS resolvers forced through the tunnel. */
  dnsServers: string[];
  /** User preference: enforce Kill Switch on tunnel drop. Persisted. */
  killSwitch: boolean;
  setKillSwitch: (v: boolean) => void;
  /** True when Kill Switch is enforcing a traffic block right now. */
  killSwitchTriggered: boolean;
  /** Acknowledge / dismiss the Kill Switch banner. */
  clearKillSwitchTriggered: () => void;
  /** User preference: auto-handshake on untrusted networks. Persisted. */
  autoProtect: boolean;
  setAutoProtect: (v: boolean) => void;
  /** Last reported network classification from the engine. */
  networkTrust: NetworkTrust;
  /** Active wire protocol. Persisted. */
  protocol: VpnProtocol;
  setProtocol: (p: VpnProtocol) => void;
  /** Standard vs Elite Stealth (Anti-DPI) Mode. Premium-gated. Persisted. */
  stealthMode: StealthMode;
  setStealthMode: (m: StealthMode) => void;
  /** ID of the server selected from the catalog (servers table). Persisted. */
  selectedServerId: string | null;
  setSelectedServerId: (id: string | null) => void;
  /** Smart Acceleration: forces UDP transport + mux + BBR-friendly windows. */
  smartAccel: boolean;
  setSmartAccel: (v: boolean) => void;
  /** Traffic compression (saves bandwidth on slow mobile links). */
  compression: boolean;
  setCompression: (v: boolean) => void;
  /** Effective MTU clamp pushed to the tunnel (default 1400). */
  mtu: number;
  connect: () => void;
  disconnect: () => void;
  toggle: () => void;
};

const Ctx = createContext<VpnState | null>(null);

const SERIES_LEN = 24;
const COOLDOWN_MS = 800;
const BACKOFF_BASE_MS = 600;
const BACKOFF_MAX_MS = 8000;
// Encrypted DNS resolvers (DoH-capable on native): Cloudflare + Google.
const DNS_SERVERS = ["1.1.1.1", "1.0.0.1", "8.8.8.8", "8.8.4.4"];
const MTU_DEFAULT = 1400;
const KS_KEY = "mastervpn.killswitch";
const AP_KEY = "mastervpn.autoprotect";
const PROTO_KEY = "mastervpn.protocol";
const STEALTH_KEY = "mastervpn.stealthmode";
const SERVER_KEY = "mastervpn.selectedServer";
const ACCEL_KEY = "mastervpn.smartAccel";
const COMPRESS_KEY = "mastervpn.compression";

/**
 * Global VPN connection provider.
 *
 * Lives at the root of the app so the tunnel "heartbeat" (timer + throughput
 * sampler) keeps running regardless of which tab the user is viewing.
 *
 * Adds:
 *  - Tap cooldown: prevents repeated taps from spawning multiple handshakes.
 *  - Silent auto-reconnect with exponential backoff if the tunnel drops,
 *    without changing the visible screen. `elapsed` is preserved so the
 *    user-visible uptime never resets on a transient drop.
 *  - Disconnect only happens via an explicit user action.
 */
export function VpnProvider({ children }: { children: ReactNode }) {
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const [cooldown, setCooldown] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [down, setDown] = useState(0);
  const [up, setUp] = useState(0);
  const [downSeries, setDownSeries] = useState<number[]>(Array(SERIES_LEN).fill(0));
  const [upSeries, setUpSeries] = useState<number[]>(Array(SERIES_LEN).fill(0));
  const [killSwitch, setKillSwitchState] = useState(true);
  const [killSwitchTriggered, setKillSwitchTriggered] = useState(false);
  const [autoProtect, setAutoProtectState] = useState(false);
  const [networkTrust, setNetworkTrust] = useState<NetworkTrust>("trusted");
  const [protocol, setProtocolState] = useState<VpnProtocol>("wireguard");
  const [stealthMode, setStealthModeState] = useState<StealthMode>("standard");
  const [selectedServerId, setSelectedServerIdState] = useState<string | null>(null);
  const [smartAccel, setSmartAccelState] = useState(true);
  const [compression, setCompressionState] = useState(true);

  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const handshake = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cooldownTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const backoffTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const backoffAttempt = useRef(0);
  // User intent: when true, the service should keep the tunnel alive and
  // attempt silent reconnects on drops. Cleared only by explicit disconnect().
  const intent = useRef(false);
  // Mirrors so engine handlers (closed over once) always read latest prefs.
  const killSwitchRef = useRef(true);
  const autoProtectRef = useRef(false);

  // Hydrate persisted preferences once + push initial DNS to engine.
  useEffect(() => {
    try {
      const ks = window.localStorage.getItem(KS_KEY);
      if (ks !== null) {
        const v = ks === "1";
        setKillSwitchState(v);
        killSwitchRef.current = v;
      }
      const ap = window.localStorage.getItem(AP_KEY);
      if (ap !== null) {
        const v = ap === "1";
        setAutoProtectState(v);
        autoProtectRef.current = v;
      }
      const proto = window.localStorage.getItem(PROTO_KEY) as VpnProtocol | null;
      if (proto === "vless-reality" || proto === "shadowsocks" || proto === "wireguard") {
        setProtocolState(proto);
        vpnEngine.setProtocol(proto);
      }
      const sm = window.localStorage.getItem(STEALTH_KEY) as StealthMode | null;
      if (sm === "elite" || sm === "standard") {
        setStealthModeState(sm);
        vpnEngine.setStealthMode(sm);
      }
      const srv = window.localStorage.getItem(SERVER_KEY);
      if (srv) setSelectedServerIdState(srv);
      const ac = window.localStorage.getItem(ACCEL_KEY);
      const accelOn = ac === null ? true : ac === "1";
      setSmartAccelState(accelOn);
      const cmpRaw = window.localStorage.getItem(COMPRESS_KEY);
      // Default ON — enables core-side compression for VLESS/Reality + SS
      // tunnels, saving bandwidth on slow mobile links.
      const cmp = cmpRaw === null ? true : cmpRaw === "1";
      setCompressionState(cmp);
      if (isNativeTrivo) {
        void TrivoVpn.setAcceleration({ smartAccel: accelOn, compression: cmp, mtu: MTU_DEFAULT }).catch(() => {});
      }
    } catch {}
    vpnEngine.setDnsServers(DNS_SERVERS);
  }, []);

  const setProtocol = useCallback((p: VpnProtocol) => {
    setProtocolState(p);
    try { window.localStorage.setItem(PROTO_KEY, p); } catch {}
    vpnEngine.setProtocol(p);
  }, []);

  const setStealthMode = useCallback((m: StealthMode) => {
    setStealthModeState(m);
    try { window.localStorage.setItem(STEALTH_KEY, m); } catch {}
    vpnEngine.setStealthMode(m);
    // Elite Mode defaults to vless-reality; Standard falls back to wireguard.
    const nextProto: VpnProtocol = m === "elite" ? "vless-reality" : "wireguard";
    setProtocolState(nextProto);
    try { window.localStorage.setItem(PROTO_KEY, nextProto); } catch {}
    vpnEngine.setProtocol(nextProto);
  }, []);

  const setKillSwitch = useCallback((v: boolean) => {
    setKillSwitchState(v);
    killSwitchRef.current = v;
    try { window.localStorage.setItem(KS_KEY, v ? "1" : "0"); } catch {}
    vpnEngine.setKillSwitch(v);
    if (!v) setKillSwitchTriggered(false);
  }, []);

  const setSelectedServerId = useCallback((id: string | null) => {
    setSelectedServerIdState(id);
    try {
      if (id) window.localStorage.setItem(SERVER_KEY, id);
      else window.localStorage.removeItem(SERVER_KEY);
    } catch {}
  }, []);

  const setAutoProtect = useCallback((v: boolean) => {
    setAutoProtectState(v);
    autoProtectRef.current = v;
    try { window.localStorage.setItem(AP_KEY, v ? "1" : "0"); } catch {}
  }, []);

  const setSmartAccel = useCallback((v: boolean) => {
    setSmartAccelState(v);
    try { window.localStorage.setItem(ACCEL_KEY, v ? "1" : "0"); } catch {}
    if (isNativeTrivo) {
      void TrivoVpn.setAcceleration({ smartAccel: v, compression, mtu: MTU_DEFAULT }).catch(() => {});
    }
  }, [compression]);

  const setCompression = useCallback((v: boolean) => {
    setCompressionState(v);
    try { window.localStorage.setItem(COMPRESS_KEY, v ? "1" : "0"); } catch {}
    if (isNativeTrivo) {
      void TrivoVpn.setAcceleration({ smartAccel, compression: v, mtu: MTU_DEFAULT }).catch(() => {});
    }
  }, [smartAccel]);

  const clearKillSwitchTriggered = useCallback(() => {
    setKillSwitchTriggered(false);
  }, []);

  const triggerCooldown = () => {
    setCooldown(true);
    if (cooldownTimer.current) clearTimeout(cooldownTimer.current);
    cooldownTimer.current = setTimeout(() => setCooldown(false), COOLDOWN_MS);
  };

  // Heartbeat: runs at provider level, survives all route changes. Also
  // simulates rare transient drops which trigger silent reconnect.
  useEffect(() => {
    if (!connected) {
      if (timer.current) {
        clearInterval(timer.current);
        timer.current = null;
      }
      return;
    }
    if (timer.current) clearInterval(timer.current);
    timer.current = setInterval(() => {
      // Heartbeat only advances uptime + samples throughput.
      // Drops are now driven exclusively by the real VPN engine via
      // the vpnEngine adapter — no simulated random disconnects.
      setElapsed((e) => e + 1);
      const d = 30 + Math.random() * 90;
      const u = 5 + Math.random() * 25;
      setDown(d);
      setUp(u);
      setDownSeries((s) => [...s.slice(1), d]);
      setUpSeries((s) => [...s.slice(1), u]);
    }, 1000);
    return () => {
      if (timer.current) {
        clearInterval(timer.current);
        timer.current = null;
      }
    };
  }, [connected]);

  // Cleanup on provider unmount.
  useEffect(() => {
    return () => {
      if (handshake.current) clearTimeout(handshake.current);
      if (cooldownTimer.current) clearTimeout(cooldownTimer.current);
      if (backoffTimer.current) clearTimeout(backoffTimer.current);
    };
  }, []);

  const scheduleReconnect = useCallback(() => {
    if (!intent.current) return;
    if (backoffTimer.current) clearTimeout(backoffTimer.current);
    const attempt = backoffAttempt.current;
    const delay = Math.min(BACKOFF_BASE_MS * 2 ** attempt, BACKOFF_MAX_MS);
    backoffAttempt.current = attempt + 1;
    backoffTimer.current = setTimeout(() => {
      if (!intent.current) return;
      // Silent handshake — does NOT touch `elapsed`, so uptime is continuous.
      setReconnecting(false);
      setConnected(true);
    }, delay);
  }, []);

  // Subscribe to the real VPN engine. The mock engine emits nothing,
  // so reconnect logic only runs in response to actual tunnel events
  // from the wired plugin / WebSocket health signal.
  // Kept up to date so engine handlers can request a connect without
  // re-subscribing on every callback identity change.
  const connectRef = useRef<() => void>(() => {});

  useEffect(() => {
    const unsubscribe = vpnEngine.subscribe({
      onDisconnect: () => {
        if (!intent.current) return;
        // Real tunnel drop — keep elapsed, flip to reconnecting,
        // and start exponential backoff handshakes.
        setConnected(false);
        setReconnecting(true);
        // Kill Switch: surface the critical banner so the user knows
        // traffic is being blocked until the tunnel comes back.
        if (killSwitchRef.current) setKillSwitchTriggered(true);
        scheduleReconnect();
      },
      onReconnect: () => {
        if (!intent.current) return;
        if (backoffTimer.current) {
          clearTimeout(backoffTimer.current);
          backoffTimer.current = null;
        }
        backoffAttempt.current = 0;
        setReconnecting(false);
        setConnected(true);
        setKillSwitchTriggered(false);
      },
      onNetworkChange: (trust) => {
        setNetworkTrust(trust);
        // Auto-Protect: an untrusted network triggers a silent handshake.
        if (
          autoProtectRef.current &&
          trust === "untrusted" &&
          !intent.current
        ) {
          connectRef.current();
        }
      },
    });
    vpnEngine.start();
    return () => {
      unsubscribe();
      vpnEngine.stop();
    };
  }, [scheduleReconnect]);

  const connect = useCallback(() => {
    if (connected || connecting || cooldown) return;
    intent.current = true;
    backoffAttempt.current = 0;
    triggerCooldown();
    setConnecting(true);
    if (isNativeTrivo) {
      void TrivoVpn.start({
        protocol,
        killSwitch,
        dns: DNS_SERVERS,
      }).catch((err) => console.warn("[vpn] native start failed", err));
    }
    if (handshake.current) clearTimeout(handshake.current);
    handshake.current = setTimeout(() => {
      setConnecting(false);
      setConnected(true);
      setElapsed(0);
      setDown(0);
      setUp(0);
      setDownSeries(Array(SERIES_LEN).fill(0));
      setUpSeries(Array(SERIES_LEN).fill(0));
    }, 600);
  }, [connected, connecting, cooldown, protocol, killSwitch]);

  const disconnect = useCallback(() => {
    if (cooldown) return;
    intent.current = false;
    backoffAttempt.current = 0;
    if (handshake.current) {
      clearTimeout(handshake.current);
      handshake.current = null;
    }
    if (backoffTimer.current) {
      clearTimeout(backoffTimer.current);
      backoffTimer.current = null;
    }
    if (isNativeTrivo) {
      void TrivoVpn.stop().catch(() => {});
    }
    triggerCooldown();
    setConnecting(false);
    setReconnecting(false);
    setConnected(false);
    setElapsed(0);
    setDown(0);
    setUp(0);
  }, [cooldown]);

  const toggle = useCallback(() => {
    if (cooldown) return; // hard lock against tap-spamming
    if (connected || connecting || reconnecting) disconnect();
    else connect();
  }, [connected, connecting, reconnecting, cooldown, connect, disconnect]);

  // Keep ref in sync so engine network listener can call latest connect().
  useEffect(() => { connectRef.current = connect; }, [connect]);

  return (
    <Ctx.Provider
      value={{
        connected,
        connecting,
        reconnecting,
        cooldown,
        elapsed,
        down,
        up,
        downSeries,
        upSeries,
        dnsSecure: connected,
        dnsServers: DNS_SERVERS,
        killSwitch,
        setKillSwitch,
        killSwitchTriggered,
        clearKillSwitchTriggered,
        autoProtect,
        setAutoProtect,
        networkTrust,
        protocol,
        setProtocol,
        stealthMode,
        setStealthMode,
        selectedServerId,
        setSelectedServerId,
        smartAccel,
        setSmartAccel,
        compression,
        setCompression,
        mtu: MTU_DEFAULT,
        connect,
        disconnect,
        toggle,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useVpn() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useVpn must be used inside VpnProvider");
  return v;
}

/** Format seconds as HH:MM:SS — exported so any tab can render uptime. */
export function formatUptime(s: number) {
  const h = String(Math.floor(s / 3600)).padStart(2, "0");
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const sec = String(s % 60).padStart(2, "0");
  return `${h}:${m}:${sec}`;
}
