/**
 * Trivo VPN — JS bridge to the native Capacitor plugin.
 *
 * The native side (Kotlin, `android-plugins/trivo-vpn/`) runs sing-box and
 * is the only place that actually carries traffic. This module is the
 * strongly-typed bridge the React layer uses to:
 *
 *   - start / stop the tunnel with full DPI-bypass parameters
 *     (VLESS-Reality publicKey/shortId/SNI, or Shadowsocks-2022 method),
 *   - run protocol-aware reachability probes (not bare TCP),
 *   - enforce in-tunnel DNS so the ISP's resolver cannot fingerprint or
 *     hijack lookups,
 *   - schedule the battery-optimised scraper / ping WorkManager jobs,
 *   - listen for native lifecycle events (health, network trust,
 *     active-port rotation).
 *
 * On web (Lovable preview) every call is a safe no-op so the UI keeps
 * rendering without a real tunnel.
 */
import { Capacitor, registerPlugin, type PluginListenerHandle } from "@capacitor/core";

export type NativeNetworkTrust = "trusted" | "untrusted" | "offline";
export type NativeHealth = "connected" | "degraded" | "down";

/** Only DPI-resistant protocols are accepted. Legacy `vless` / bare
 *  `shadowsocks` are intentionally absent — they are blocked on hostile
 *  networks and must not be reachable from the UI. */
export type DpiBypassProtocol = "vless-reality" | "shadowsocks-2022";

/** Reality handshake parameters. All four fields are mandatory: without
 *  them the server cannot impersonate a legitimate TLS site and the
 *  connection is trivially fingerprinted. */
export interface RealityParams {
  /** X25519 public key from the server's Reality keypair (base64-url). */
  publicKey: string;
  /** Short ID negotiated during Reality handshake (hex). */
  shortId: string;
  /** Hostname mimicked during the TLS ClientHello — must be a real,
   *  publicly reachable site (e.g. `www.microsoft.com`, `www.google.com`). */
  sni: string;
  /** TLS ClientHello fingerprint to imitate. */
  fingerprint?: "chrome" | "firefox" | "safari" | "ios" | "edge";
  /** Optional XTLS flow control (e.g. `xtls-rprx-vision`). */
  flow?: string;
}

/** Shadowsocks-2022 credentials. */
export interface Ss2022Params {
  /** SS-2022 cipher, e.g. `2022-blake3-aes-256-gcm`. */
  method: string;
  /** Base64 PSK (matches server `password`). */
  password: string;
}

/** Server descriptor passed to native `start`. Carries exactly the
 *  DPI-bypass material the Kotlin layer needs to build a sing-box
 *  outbound — no UUIDs or URI parsing on the JS side. */
export interface NativeServer {
  host: string;
  port: number;
  /** Original provisioning URI, kept for the native side to re-parse if
   *  it prefers (vless://… with reality params, or ss://2022-…). */
  config: string;
  /** UUID for VLESS / identity for SS-2022 (when not derivable from URI). */
  uuid?: string;
  reality?: RealityParams;
  ss2022?: Ss2022Params;
}

export interface TcpPingOptions {
  host: string;
  port: number;
  timeoutMs?: number;
  /** Protocol-aware handshake the native side should perform instead of a
   *  plain TCP `connect`. Required to detect DPI black-holing where the
   *  socket completes but the application handshake never finishes. */
  protocol?: DpiBypassProtocol;
  /** When `protocol === "vless-reality"`, this SNI is used for the probe
   *  TLS ClientHello so the test traffic looks identical to a real
   *  session. */
  sni?: string;
}
export interface TcpPingResult { rttMs: number | null }

export interface StartOptions {
  protocol: DpiBypassProtocol;
  server: NativeServer;
  killSwitch?: boolean;
  /**
   * In-tunnel DNS. If omitted the native side falls back to a hardened
   * default (`1.1.1.1`, `8.8.8.8`). The native VpnService MUST install
   * these as the only resolvers on the tun interface — never the
   * carrier's DNS — to eliminate the ISP DNS leak.
   */
  dns?: string[];
  /** Bypass the tunnel for these package names (split tunneling). */
  disallowedApps?: string[];
}

export interface AccelerationOptions {
  smartAccel: boolean;
  compression: boolean;
  mtu?: number;
}

export interface TrivoVpnPlugin {
  /** Protocol-aware reachability probe. The native side performs the
   *  full handshake for the requested protocol (Reality TLS ClientHello
   *  or SS-2022 salt exchange) before returning the RTT. */
  tcpPing(opts: TcpPingOptions): Promise<TcpPingResult>;
  /** ICMP echo — only meaningful on networks that don't block it. */
  icmpPing(opts: TcpPingOptions): Promise<TcpPingResult>;
  start(opts: StartOptions): Promise<{ started: boolean }>;
  stop(): Promise<{ stopped: boolean }>;
  setProtocol(opts: { protocol: DpiBypassProtocol }): Promise<void>;
  setKillSwitch(opts: { enabled: boolean }): Promise<void>;
  setStealthMode(opts: { mode: "standard" | "elite" }): Promise<void>;
  setAcceleration(opts: AccelerationOptions): Promise<void>;
  scheduleScraper(opts: { intervalMinutes: number }): Promise<{ scheduled: boolean }>;
  cancelScraper(): Promise<void>;
  isIgnoringBatteryOptimizations(): Promise<{ ignoring: boolean }>;
  requestIgnoreBatteryOptimizations(): Promise<{ requested: boolean }>;
  addListener(
    event: "healthChange",
    cb: (e: { state: NativeHealth }) => void,
  ): Promise<PluginListenerHandle>;
  addListener(
    event: "networkChange",
    cb: (e: { trust: NativeNetworkTrust }) => void,
  ): Promise<PluginListenerHandle>;
  addListener(
    event: "portChange",
    cb: (e: { port: number | null }) => void,
  ): Promise<PluginListenerHandle>;
}

/** Hardened defaults: Cloudflare + Google DoH-compatible resolvers that
 *  the native sing-box outbound routes inside the tunnel. */
export const DEFAULT_IN_TUNNEL_DNS: readonly string[] = ["1.1.1.1", "8.8.8.8"];

const noopHandle: PluginListenerHandle = { remove: async () => {} };

const webFallback: TrivoVpnPlugin = {
  async tcpPing() { return { rttMs: null }; },
  async icmpPing() { return { rttMs: null }; },
  async start() { return { started: false }; },
  async stop() { return { stopped: false }; },
  async setProtocol() {},
  async setKillSwitch() {},
  async setStealthMode() {},
  async setAcceleration() {},
  async scheduleScraper() { return { scheduled: false }; },
  async cancelScraper() {},
  async isIgnoringBatteryOptimizations() { return { ignoring: true }; },
  async requestIgnoreBatteryOptimizations() { return { requested: false }; },
  async addListener() { return noopHandle; },
};

export const TrivoVpn = registerPlugin<TrivoVpnPlugin>("TrivoVpn", {
  web: () => webFallback,
});

/** True only when running inside the Capacitor native shell on Android. */
export const isNativeTrivo: boolean =
  Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";
