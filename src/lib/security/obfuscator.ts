/**
 * Trivo VPN — transport-layer obfuscation profile builder.
 *
 * This module is **pure configuration**. It does not open sockets, run
 * WebRTC probes, query DNS, or talk to Cloudflare. Its single job is to
 * produce a deterministic, fully-populated `ObfuscationProfile` object
 * that the native sing-box outbound consumes via
 * `TrivoVpn.setStealthMode(...)`.
 *
 * Two modes are supported:
 *
 *   - `"standard"` — light-touch defense. Payload length randomization
 *     and packet padding are sufficient to break naive length-histogram
 *     classifiers (the kind most home / SMB middleboxes ship with).
 *
 *   - `"elite"`    — full TLS 1.3 ClientHello mimicry with browser-grade
 *     cipher suite ordering, randomized SNI padding, and jittered
 *     handshake timing. Designed to defeat stateful DPI appliances
 *     (Carrier-grade NAT inspection, GFW-style classifiers, corporate
 *     SSL-inspection middleboxes) that fingerprint TLS handshakes.
 *
 * NO leak-detection code lives here. That belongs in
 * `src/lib/security/leakDetector.ts`.
 */

import type { PluginListenerHandle } from "@capacitor/core";
import { TrivoVpn } from "@/native/trivoVpn";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type ObfuscationMode = "standard" | "elite";

/** TLS ClientHello fingerprint to imitate on the wire. Matches the set
 *  exposed by sing-box `utls` (`uTLS`) — keep in sync with native. */
export type TlsFingerprint =
  | "chrome"
  | "firefox"
  | "safari"
  | "ios"
  | "edge"
  | "android"
  | "random";

/** Padding parameters applied to every outgoing record. Sizes are in
 *  bytes; the runtime picks a uniformly-random value in `[min, max]`
 *  per packet to flatten length distributions. */
export interface PaddingPolicy {
  /** Minimum padding bytes appended to each record. */
  minBytes: number;
  /** Maximum padding bytes appended to each record. */
  maxBytes: number;
  /** Probability (0..1) that a given packet receives padding at all.
   *  `1.0` always pads, lower values mix unpadded packets to defeat
   *  "always-padded" heuristics. */
  probability: number;
}

/** Length distribution applied to the *payload* (post-encryption) so
 *  short keepalive packets cannot be distinguished from real traffic. */
export interface PayloadShaping {
  /** Round payload size up to the nearest multiple of this many bytes. */
  alignmentBytes: number;
  /** Add a random jitter (0..jitterBytes) on top of the alignment. */
  jitterBytes: number;
}

/** Dynamic outbound port rotation. The native side picks the next port
 *  from `pool` every `intervalSeconds` (± `jitterSeconds`). Pool entries
 *  must be valid TCP ports the server accepts. */
export interface PortHopPolicy {
  enabled: boolean;
  pool: number[];
  intervalSeconds: number;
  jitterSeconds: number;
}

/** Extra HTTP/S mimicry headers prepended to the first application
 *  record (`elite` mode only). These headers are never delivered to the
 *  remote server — they only need to look real to an on-path inspector. */
export interface HttpMimicryHeader {
  name: string;
  value: string;
}

/** TLS 1.3 ClientHello shaping parameters. */
export interface TlsClientHelloProfile {
  /** uTLS fingerprint to emulate. */
  fingerprint: TlsFingerprint;
  /** Ordered cipher suite list — IANA 2-byte hex codes (lowercase). */
  cipherSuites: string[];
  /** Ordered TLS extensions — IANA extension IDs. */
  extensions: number[];
  /** ALPN values to advertise. */
  alpn: string[];
  /** Supported signature algorithms (IANA 2-byte hex codes). */
  signatureAlgorithms: string[];
  /** Supported elliptic-curve groups. */
  supportedGroups: string[];
  /** TLS record versions to advertise (e.g. ["0x0303","0x0304"]). */
  supportedVersions: string[];
  /** Compression methods (almost always `["null"]` in TLS 1.3). */
  compressionMethods: string[];
  /** GREASE values to inject — random per session when `true`. */
  grease: boolean;
}

/** SNI padding extension (RFC 7685) — adds a random number of zero bytes
 *  to the ClientHello so its total length never matches the "minimal"
 *  ClientHello signature DPI vendors look for. */
export interface SniPaddingPolicy {
  enabled: boolean;
  minBytes: number;
  maxBytes: number;
}

/** Per-stage handshake delay (milliseconds). The native side waits a
 *  uniformly-random value in `[min, max]` before sending the next
 *  flight, simulating the variance a real browser exhibits. */
export interface HandshakeTiming {
  preClientHelloMinMs: number;
  preClientHelloMaxMs: number;
  postClientHelloMinMs: number;
  postClientHelloMaxMs: number;
  postFinishedMinMs: number;
  postFinishedMaxMs: number;
}

/** Aggregate transport profile. All sub-policies are always present
 *  (no optional fields) so the native consumer never needs null checks. */
export interface ObfuscationProfile {
  mode: ObfuscationMode;
  /** Schema version — bumped when the native contract changes. */
  version: 2;
  padding: PaddingPolicy;
  payload: PayloadShaping;
  portHop: PortHopPolicy;
  tls: TlsClientHelloProfile;
  sniPadding: SniPaddingPolicy;
  timing: HandshakeTiming;
  httpMimicry: HttpMimicryHeader[];
}

// ---------------------------------------------------------------------------
// Constants — handpicked from real browser captures
// ---------------------------------------------------------------------------

/** Chrome 124 stable TLS 1.3 cipher order — matches the uTLS
 *  `HelloChrome_120` preset. */
const CHROME_CIPHER_SUITES: readonly string[] = [
  "0x1301", // TLS_AES_128_GCM_SHA256
  "0x1302", // TLS_AES_256_GCM_SHA384
  "0x1303", // TLS_CHACHA20_POLY1305_SHA256
  "0xc02b", // ECDHE-ECDSA-AES128-GCM-SHA256
  "0xc02f", // ECDHE-RSA-AES128-GCM-SHA256
  "0xc02c", // ECDHE-ECDSA-AES256-GCM-SHA384
  "0xc030", // ECDHE-RSA-AES256-GCM-SHA384
  "0xcca9", // ECDHE-ECDSA-CHACHA20-POLY1305
  "0xcca8", // ECDHE-RSA-CHACHA20-POLY1305
  "0xc013", // ECDHE-RSA-AES128-SHA
  "0xc014", // ECDHE-RSA-AES256-SHA
  "0x009c", // AES128-GCM-SHA256
  "0x009d", // AES256-GCM-SHA384
  "0x002f", // AES128-SHA
  "0x0035", // AES256-SHA
];

/** Chrome extension ordering (IANA IDs). */
const CHROME_EXTENSIONS: readonly number[] = [
  0,   // server_name
  23,  // extended_master_secret
  65281, // renegotiation_info
  10,  // supported_groups
  11,  // ec_point_formats
  35,  // session_ticket
  16,  // application_layer_protocol_negotiation
  5,   // status_request
  13,  // signature_algorithms
  18,  // signed_certificate_timestamp
  51,  // key_share
  45,  // psk_key_exchange_modes
  43,  // supported_versions
  27,  // compress_certificate
  17513, // application_settings
  21,  // padding
];

const CHROME_SIG_ALGS: readonly string[] = [
  "0x0403", "0x0804", "0x0401", "0x0503", "0x0805",
  "0x0501", "0x0806", "0x0601",
];

const CHROME_GROUPS: readonly string[] = [
  "x25519", "secp256r1", "secp384r1",
];

/** Plausible per-flight delays measured from real Chrome handshakes
 *  against Cloudflare edges (median ~6ms, 95p ~28ms). We use a wider
 *  band so the variance itself looks organic. */
const ELITE_TIMING: HandshakeTiming = {
  preClientHelloMinMs: 4,
  preClientHelloMaxMs: 22,
  postClientHelloMinMs: 6,
  postClientHelloMaxMs: 38,
  postFinishedMinMs: 2,
  postFinishedMaxMs: 14,
};

/** Standard-mode timing is shorter — we're not trying to mimic a full
 *  browser, just avoid the "zero delay" tell. */
const STANDARD_TIMING: HandshakeTiming = {
  preClientHelloMinMs: 0,
  preClientHelloMaxMs: 6,
  postClientHelloMinMs: 0,
  postClientHelloMaxMs: 10,
  postFinishedMinMs: 0,
  postFinishedMaxMs: 4,
};

/** Mobile carrier-friendly port pool — all ports commonly seen carrying
 *  legitimate HTTPS so a transition between them is unremarkable. */
const ELITE_PORT_POOL: readonly number[] = [443, 8443, 2053, 2083, 2087, 2096];
const STANDARD_PORT_POOL: readonly number[] = [443, 8443];

/** Headers cloned from a real Chrome `GET /` against `www.microsoft.com`. */
const ELITE_HTTP_MIMICRY: readonly HttpMimicryHeader[] = [
  { name: "User-Agent", value: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36" },
  { name: "Accept", value: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8" },
  { name: "Accept-Language", value: "en-US,en;q=0.9" },
  { name: "Accept-Encoding", value: "gzip, deflate, br, zstd" },
  { name: "Sec-Fetch-Site", value: "none" },
  { name: "Sec-Fetch-Mode", value: "navigate" },
  { name: "Sec-Fetch-User", value: "?1" },
  { name: "Sec-Fetch-Dest", value: "document" },
  { name: "Sec-Ch-Ua", value: '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"' },
  { name: "Sec-Ch-Ua-Mobile", value: "?0" },
  { name: "Sec-Ch-Ua-Platform", value: '"Windows"' },
  { name: "Upgrade-Insecure-Requests", value: "1" },
];

// ---------------------------------------------------------------------------
// Profile builders
// ---------------------------------------------------------------------------

function buildStandardProfile(): ObfuscationProfile {
  return {
    mode: "standard",
    version: 2,
    padding: {
      minBytes: 16,
      maxBytes: 96,
      probability: 0.75,
    },
    payload: {
      alignmentBytes: 64,
      jitterBytes: 24,
    },
    portHop: {
      enabled: false,
      pool: [...STANDARD_PORT_POOL],
      intervalSeconds: 0,
      jitterSeconds: 0,
    },
    tls: {
      fingerprint: "chrome",
      cipherSuites: [...CHROME_CIPHER_SUITES],
      extensions: [...CHROME_EXTENSIONS],
      alpn: ["h2", "http/1.1"],
      signatureAlgorithms: [...CHROME_SIG_ALGS],
      supportedGroups: [...CHROME_GROUPS],
      supportedVersions: ["0x0304", "0x0303"],
      compressionMethods: ["null"],
      grease: false,
    },
    sniPadding: {
      enabled: true,
      minBytes: 8,
      maxBytes: 32,
    },
    timing: { ...STANDARD_TIMING },
    httpMimicry: [],
  };
}

function buildEliteProfile(): ObfuscationProfile {
  return {
    mode: "elite",
    version: 2,
    padding: {
      minBytes: 48,
      maxBytes: 240,
      probability: 1.0,
    },
    payload: {
      alignmentBytes: 128,
      jitterBytes: 72,
    },
    portHop: {
      enabled: true,
      pool: [...ELITE_PORT_POOL],
      intervalSeconds: 90,
      jitterSeconds: 25,
    },
    tls: {
      fingerprint: "chrome",
      cipherSuites: [...CHROME_CIPHER_SUITES],
      extensions: [...CHROME_EXTENSIONS],
      alpn: ["h2", "http/1.1"],
      signatureAlgorithms: [...CHROME_SIG_ALGS],
      supportedGroups: [...CHROME_GROUPS],
      supportedVersions: ["0x0304", "0x0303"],
      compressionMethods: ["null"],
      grease: true,
    },
    sniPadding: {
      enabled: true,
      minBytes: 32,
      maxBytes: 128,
    },
    timing: { ...ELITE_TIMING },
    httpMimicry: ELITE_HTTP_MIMICRY.map((h) => ({ ...h })),
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Build a fully-populated obfuscation profile for the requested mode.
 *  Pure function — same input always yields a structurally identical
 *  result. The runtime randomization (per-packet padding values,
 *  per-session GREASE, port-hop selection) happens on the native side. */
export function generateObfuscationProfile(mode: ObfuscationMode): ObfuscationProfile {
  return mode === "elite" ? buildEliteProfile() : buildStandardProfile();
}

/** Validate a profile before handing it to native. Throws on any
 *  structural issue so misconfigurations surface in dev rather than
 *  silently degrading stealth in production. */
export function assertValidProfile(p: ObfuscationProfile): void {
  if (p.version !== 2) throw new Error(`obfuscator: unsupported profile version ${p.version}`);
  if (p.padding.minBytes < 0 || p.padding.maxBytes < p.padding.minBytes) {
    throw new Error("obfuscator: invalid padding range");
  }
  if (p.padding.probability < 0 || p.padding.probability > 1) {
    throw new Error("obfuscator: padding probability must be in [0,1]");
  }
  if (p.payload.alignmentBytes <= 0 || p.payload.jitterBytes < 0) {
    throw new Error("obfuscator: invalid payload shaping");
  }
  if (p.portHop.enabled) {
    if (p.portHop.pool.length === 0) throw new Error("obfuscator: port-hop enabled with empty pool");
    if (p.portHop.intervalSeconds <= 0) throw new Error("obfuscator: port-hop interval must be > 0");
    for (const port of p.portHop.pool) {
      if (!Number.isInteger(port) || port < 1 || port > 65535) {
        throw new Error(`obfuscator: invalid port-hop entry ${port}`);
      }
    }
  }
  if (p.tls.cipherSuites.length === 0) throw new Error("obfuscator: empty cipher suite list");
  if (p.tls.alpn.length === 0) throw new Error("obfuscator: empty ALPN list");
  if (p.sniPadding.enabled && p.sniPadding.maxBytes < p.sniPadding.minBytes) {
    throw new Error("obfuscator: invalid SNI padding range");
  }
  const t = p.timing;
  const pairs: Array<[number, number]> = [
    [t.preClientHelloMinMs, t.preClientHelloMaxMs],
    [t.postClientHelloMinMs, t.postClientHelloMaxMs],
    [t.postFinishedMinMs, t.postFinishedMaxMs],
  ];
  for (const [lo, hi] of pairs) {
    if (lo < 0 || hi < lo) throw new Error("obfuscator: invalid handshake timing range");
  }
}

/**
 * Native-bridge integration. Builds the profile for the requested mode,
 * validates it, then forwards the mode tag to
 * `TrivoVpn.setStealthMode(...)`. The full profile is also returned so
 * callers (UI, telemetry) can inspect what was applied.
 *
 * The current native plugin contract only exposes a `mode` discriminator
 * for `setStealthMode`. The native side reads the corresponding profile
 * from its bundled copy of these defaults — keeping the bridge surface
 * small while letting this module remain the single source of truth for
 * the *shape* of each profile.
 */
export async function applyStealthMode(mode: ObfuscationMode): Promise<ObfuscationProfile> {
  const profile = generateObfuscationProfile(mode);
  assertValidProfile(profile);
  await TrivoVpn.setStealthMode({ mode });
  return profile;
}

/** Convenience: subscribe to native health changes so callers can
 *  re-apply the active mode after a reconnect (some carriers reset
 *  middlebox state on path change, which is a good moment to rotate the
 *  TLS fingerprint). */
export async function onReconnectReapplyStealth(
  mode: ObfuscationMode,
): Promise<PluginListenerHandle> {
  return TrivoVpn.addListener("healthChange", (e) => {
    if (e.state === "connected") {
      void applyStealthMode(mode);
    }
  });
}
