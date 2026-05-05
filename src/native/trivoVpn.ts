/**
 * Trivo VPN — JS bridge to the native Capacitor plugin.
 *
 * In a real build (after `npx cap add android` + `npx cap sync`), the
 * `TrivoVpn` plugin is registered by Capacitor and routed to the Kotlin
 * implementation in `android-plugins/trivo-vpn/`.
 *
 * In the browser / Lovable preview the plugin is unavailable. This module
 * exposes `isNative` + safe no-op fallbacks so the rest of the codebase
 * (vpnEngine, ServerSheet) can call it unconditionally.
 */
import { Capacitor, registerPlugin, type PluginListenerHandle } from "@capacitor/core";

export type NativeNetworkTrust = "trusted" | "untrusted" | "offline";
export type NativeHealth = "connected" | "degraded" | "down";

export interface TcpPingOptions { host: string; port: number; timeoutMs?: number }
export interface TcpPingResult { rttMs: number | null }

export interface StartOptions {
  protocol: "vless-reality" | "shadowsocks" | "wireguard";
  server?: { host: string; port: number; config: string } | null;
  killSwitch?: boolean;
  dns?: string[];
  disallowedApps?: string[];
}

export interface AccelerationOptions {
  smartAccel: boolean;
  compression: boolean;
  mtu?: number;
}

export interface TrivoVpnPlugin {
  tcpPing(opts: TcpPingOptions): Promise<TcpPingResult>;
  icmpPing(opts: TcpPingOptions): Promise<TcpPingResult>;
  start(opts: StartOptions): Promise<{ started: boolean }>;
  stop(): Promise<{ stopped: boolean }>;
  setProtocol(opts: { protocol: StartOptions["protocol"] }): Promise<void>;
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
}

/**
 * `registerPlugin` returns a proxy that throws on web unless we provide
 * a fallback. We always return safe no-ops in the web fallback so the
 * existing mock VPN engine + HTTP-RTT pseudo-ping keep working.
 */
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
