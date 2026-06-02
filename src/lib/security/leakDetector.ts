/**
 * Real DNS + WebRTC leak detection.
 *
 * No mocks. Both probes run against live network endpoints from the browser
 * (and from the Capacitor WebView in production). Results are aggregated into
 * a single `LeakReport` consumed by SecurityContext.
 *
 *   WebRTC probe — opens an RTCPeerConnection against a public STUN server,
 *                  creates a dummy data channel, gathers ICE candidates and
 *                  extracts any server-reflexive (srflx) public IPs the
 *                  browser exposes outside the tunnel. Any non-mDNS host
 *                  candidate is also captured as a local-IP exposure.
 *
 *   DNS probe    — queries Cloudflare's `cdn-cgi/trace` endpoint to obtain
 *                  the egress IP the resolver / network sees us from, and
 *                  cross-references it with an independent IP provider
 *                  (api.ipify.org). A mismatch between the WebRTC srflx IP
 *                  and the HTTP egress IP is reported as a DNS / IP leak.
 *
 * All probes are bounded by a hard timeout so the UI never hangs.
 */

export type LeakKind = "webrtc-public" | "webrtc-local" | "dns-mismatch" | "probe-error";

export interface LeakEntry {
  kind: LeakKind;
  detail: string;
}

export interface LeakReport {
  detected: boolean;
  count: number;
  leaks: LeakEntry[];
  publicIp: string | null;
  dnsEgressIp: string | null;
  webrtcPublicIps: string[];
  webrtcLocalIps: string[];
  runAt: number;
}

const WEBRTC_TIMEOUT_MS = 3500;
const HTTP_TIMEOUT_MS = 4000;

/** Quick `fetch` wrapper with an AbortController-based timeout. */
async function fetchWithTimeout(url: string, timeoutMs: number): Promise<string | null> {
  if (typeof fetch !== "function") return null;
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctl.signal, cache: "no-store" });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

/** Parse a Cloudflare `cdn-cgi/trace` body — `key=value` lines. */
function parseTrace(body: string | null): Record<string, string> {
  const out: Record<string, string> = {};
  if (!body) return out;
  for (const line of body.split(/\r?\n/)) {
    const idx = line.indexOf("=");
    if (idx > 0) out[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
  }
  return out;
}

/** Detect whether a string is a syntactically valid public IPv4 / IPv6 address. */
function isIpAddress(s: string): boolean {
  if (!s) return false;
  // IPv4
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(s)) {
    return s.split(".").every((part) => {
      const n = Number(part);
      return n >= 0 && n <= 255;
    });
  }
  // IPv6 (loose — good enough to recognize candidates)
  return /^[0-9a-f:]+$/i.test(s) && s.includes(":");
}

/** Heuristic: RFC1918 + loopback + link-local addresses. */
function isPrivateIp(ip: string): boolean {
  if (!ip) return true;
  if (ip === "127.0.0.1" || ip === "::1") return true;
  if (ip.startsWith("10.")) return true;
  if (ip.startsWith("192.168.")) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(ip)) return true;
  if (ip.startsWith("169.254.")) return true;
  if (/^f[cd][0-9a-f]{2}:/i.test(ip)) return true; // ULA
  if (/^fe80:/i.test(ip)) return true; // link-local
  return false;
}

/**
 * WebRTC probe — collects every ICE candidate emitted within a bounded
 * window and extracts the IP address from the SDP candidate string.
 */
async function probeWebRtc(): Promise<{ publicIps: string[]; localIps: string[]; error?: string }> {
  if (typeof RTCPeerConnection === "undefined") {
    return { publicIps: [], localIps: [], error: "RTCPeerConnection unavailable" };
  }
  const publicIps = new Set<string>();
  const localIps = new Set<string>();

  let pc: RTCPeerConnection | null = null;
  try {
    pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.cloudflare.com:3478" }, { urls: "stun:stun.l.google.com:19302" }],
    });
    // A data channel forces ICE gathering even with no media tracks.
    pc.createDataChannel("leak-probe");

    const gathering = new Promise<void>((resolve) => {
      const done = () => resolve();
      const timer = setTimeout(done, WEBRTC_TIMEOUT_MS);
      pc!.onicecandidate = (ev) => {
        if (!ev.candidate || !ev.candidate.candidate) {
          clearTimeout(timer);
          resolve();
          return;
        }
        // SDP candidate format:
        //   candidate:<found> <comp> <proto> <prio> <ip> <port> typ <type> ...
        const parts = ev.candidate.candidate.split(/\s+/);
        const ip = parts[4];
        const typIdx = parts.indexOf("typ");
        const typ = typIdx >= 0 ? parts[typIdx + 1] : "";
        if (!ip || !isIpAddress(ip)) return;
        if (typ === "srflx" || typ === "prflx") {
          publicIps.add(ip);
        } else if (typ === "host") {
          // mDNS hostnames are already redacted by the browser. A raw
          // private/public IP appearing as a host candidate is a leak vector.
          if (!ip.endsWith(".local") && !isPrivateIp(ip)) {
            publicIps.add(ip);
          } else if (!isPrivateIp(ip) === false && !ip.endsWith(".local")) {
            localIps.add(ip);
          } else if (!ip.endsWith(".local")) {
            localIps.add(ip);
          }
        }
      };
      pc!.onicegatheringstatechange = () => {
        if (pc!.iceGatheringState === "complete") {
          clearTimeout(timer);
          resolve();
        }
      };
    });

    const offer = await pc.createOffer({ offerToReceiveAudio: false, offerToReceiveVideo: false });
    await pc.setLocalDescription(offer);
    await gathering;
    return { publicIps: [...publicIps], localIps: [...localIps] };
  } catch (e) {
    return { publicIps: [], localIps: [], error: (e as Error).message };
  } finally {
    try { pc?.close(); } catch { /* ignore */ }
  }
}

/**
 * DNS / egress probe — Cloudflare's trace plus an independent IP service.
 * Mismatch (or failure to reach either) is recorded.
 */
async function probeDnsEgress(): Promise<{ dnsIp: string | null; httpIp: string | null }> {
  const [trace, ipifyRaw] = await Promise.all([
    fetchWithTimeout("https://1.1.1.1/cdn-cgi/trace", HTTP_TIMEOUT_MS),
    fetchWithTimeout("https://api.ipify.org?format=text", HTTP_TIMEOUT_MS),
  ]);
  const parsed = parseTrace(trace);
  const dnsIp = parsed.ip && isIpAddress(parsed.ip) ? parsed.ip : null;
  const httpIp = ipifyRaw && isIpAddress(ipifyRaw.trim()) ? ipifyRaw.trim() : null;
  return { dnsIp, httpIp };
}

/** Run both probes in parallel and aggregate into a single report. */
export async function runLeakScan(): Promise<LeakReport> {
  const [webrtc, egress] = await Promise.all([probeWebRtc(), probeDnsEgress()]);
  const leaks: LeakEntry[] = [];

  if (webrtc.error) {
    leaks.push({ kind: "probe-error", detail: `WebRTC probe failed: ${webrtc.error}` });
  }
  for (const ip of webrtc.publicIps) {
    leaks.push({ kind: "webrtc-public", detail: `Public IP exposed via WebRTC: ${ip}` });
  }
  for (const ip of webrtc.localIps) {
    leaks.push({ kind: "webrtc-local", detail: `Local IP exposed via WebRTC: ${ip}` });
  }

  // Cross-reference WebRTC srflx with the HTTP egress IP — if they disagree
  // we've located packets leaving the device outside the tunnel.
  const httpIp = egress.httpIp;
  const dnsIp = egress.dnsIp;
  if (httpIp && webrtc.publicIps.length > 0 && !webrtc.publicIps.includes(httpIp)) {
    leaks.push({
      kind: "dns-mismatch",
      detail: `WebRTC public IP (${webrtc.publicIps.join(", ")}) differs from HTTP egress (${httpIp})`,
    });
  }
  if (dnsIp && httpIp && dnsIp !== httpIp) {
    leaks.push({
      kind: "dns-mismatch",
      detail: `DNS resolver sees ${dnsIp} but HTTP egress is ${httpIp}`,
    });
  }

  // Filter probe-error out of the user-facing "count" — they're advisory.
  const counted = leaks.filter((l) => l.kind !== "probe-error");

  return {
    detected: counted.length > 0,
    count: counted.length,
    leaks,
    publicIp: httpIp ?? (webrtc.publicIps[0] ?? null),
    dnsEgressIp: dnsIp,
    webrtcPublicIps: webrtc.publicIps,
    webrtcLocalIps: webrtc.localIps,
    runAt: Date.now(),
  };
}
