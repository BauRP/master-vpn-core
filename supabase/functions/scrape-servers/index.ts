/**
 * scrape-servers — DPI-resistant edition.
 *
 * Pulls VLESS-Reality and Shadowsocks-2022 nodes from public aggregators,
 * strictly validates the handshake material required to bypass DPI, and
 * upserts the result into `public.servers`.
 *
 * Anything that is not Reality or SS-2022 is silently dropped — the table
 * has a CHECK constraint that rejects legacy `vless`/`shadowsocks` rows.
 *
 * Invoked every 30 minutes by pg_cron, or manually via the in-app
 * "Refresh" button (supabase.functions.invoke("scrape-servers")).
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

// ---------------------------------------------------------------------------
// Sources — real, public, raw GitHub aggregators that refresh hourly/daily.
// Each one returns plain text or base64-encoded subscription content.
// ---------------------------------------------------------------------------
type Source = { id: string; url: string };

const SOURCES: Source[] = [
  // Pawdroid — refreshed every hour. Mixed protocol subscription.
  { id: "pawdroid-free", url: "https://raw.githubusercontent.com/Pawdroid/Free-servers/main/sub" },
  // MahdiBland aggregator — separate VLESS and SS feeds, refreshed daily.
  { id: "mahdi-vless", url: "https://raw.githubusercontent.com/mahdibland/V2RayAggregator/master/sub/splitted/vless.txt" },
  { id: "mahdi-ss", url: "https://raw.githubusercontent.com/mahdibland/V2RayAggregator/master/sub/splitted/shadowsocks.txt" },
  // Reality-only aggregator from soroushmirzaei (refreshed every few hours).
  { id: "soroush-reality", url: "https://raw.githubusercontent.com/soroushmirzaei/telegram-configs-collector/main/protocols/reality" },
  { id: "soroush-vless", url: "https://raw.githubusercontent.com/soroushmirzaei/telegram-configs-collector/main/protocols/vless" },
  { id: "soroush-ss", url: "https://raw.githubusercontent.com/soroushmirzaei/telegram-configs-collector/main/protocols/shadowsocks" },
  // barry-far aggregator — splitted by protocol, refreshed every 30 min.
  { id: "barry-vless", url: "https://raw.githubusercontent.com/barry-far/V2ray-Configs/main/Splitted-By-Protocol/vless.txt" },
  { id: "barry-ss", url: "https://raw.githubusercontent.com/barry-far/V2ray-Configs/main/Splitted-By-Protocol/ss.txt" },
  // MhdiTaheri V2rayCollector — mixed pool, refreshed every 4 hours.
  { id: "mhditaheri-vless", url: "https://raw.githubusercontent.com/MhdiTaheri/V2rayCollector/main/sub/Mix/vless.txt" },
  { id: "mhditaheri-ss", url: "https://raw.githubusercontent.com/MhdiTaheri/V2rayCollector/main/sub/Mix/ss.txt" },
  // Epodonios — daily refresh, large pool.
  { id: "epodonios-vless", url: "https://raw.githubusercontent.com/Epodonios/v2ray-configs/main/Splitted-By-Protocol/vless.txt" },
  { id: "epodonios-ss", url: "https://raw.githubusercontent.com/Epodonios/v2ray-configs/main/Splitted-By-Protocol/ss.txt" },
];

// Hard caps per run.
const MAX_PER_SOURCE = 250;
const MAX_PROBE_CANDIDATES = 600;
const PROBE_TIMEOUT_MS = 1500;
const PROBE_CONCURRENCY = 32;

const VLESS_RE = /vless:\/\/[^\s<>"'`]+/g;
const SS_RE = /ss:\/\/[^\s<>"'`]+/g;

// SS-2022 ciphers we accept. AEAD-2022 family only.
const SS2022_METHODS = new Set([
  "2022-blake3-aes-128-gcm",
  "2022-blake3-aes-256-gcm",
  "2022-blake3-chacha20-poly1305",
]);

// Fingerprints we'll forward to the native bridge.
const FP_ALLOWED = new Set(["chrome", "firefox", "safari", "ios", "android", "edge", "360", "qq", "random"]);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type RealityNode = {
  kind: "vless-reality";
  config: string;
  host: string;
  port: number;
  uuid: string;
  publicKey: string;
  shortId: string;
  sni: string;
  fingerprint: string;
  flow: string | null;
  source: string;
};

type Ss2022Node = {
  kind: "shadowsocks-2022";
  config: string;
  host: string;
  port: number;
  method: string;
  password: string;
  source: string;
};

type Node = RealityNode | Ss2022Node;

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------
function b64decode(input: string): string | null {
  try {
    let s = input.replace(/-/g, "+").replace(/_/g, "/").replace(/\s+/g, "");
    while (s.length % 4) s += "=";
    return atob(s);
  } catch {
    return null;
  }
}

function maybeDecodeSubscription(text: string): string {
  const trimmed = text.trim();
  // Heuristic: large body, no scheme, base64 charset.
  if (
    trimmed.length > 80 &&
    !trimmed.includes("://") &&
    /^[A-Za-z0-9+/=_\-\s]+$/.test(trimmed)
  ) {
    const decoded = b64decode(trimmed);
    if (decoded && (decoded.includes("vless://") || decoded.includes("ss://"))) {
      return decoded;
    }
  }
  return text;
}

function parsePort(s: string | undefined | null): number | null {
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) && n > 0 && n < 65536 ? n : null;
}

function isUuid(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}

function isHost(s: string): boolean {
  if (!s || s.length > 253) return false;
  // domain or ipv4 or [ipv6]
  if (/^\[[0-9a-fA-F:]+\]$/.test(s)) return true;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(s)) return true;
  return /^[A-Za-z0-9]([A-Za-z0-9\-]{0,61}[A-Za-z0-9])?(\.[A-Za-z0-9]([A-Za-z0-9\-]{0,61}[A-Za-z0-9])?)+$/.test(s);
}

// ---------------------------------------------------------------------------
// VLESS-Reality parser
//   vless://UUID@host:port?security=reality&pbk=...&sid=...&sni=...&fp=...&flow=...#tag
// ---------------------------------------------------------------------------
function parseVlessReality(uri: string, source: string): RealityNode | null {
  try {
    const u = new URL(uri);
    if (u.protocol !== "vless:") return null;
    const uuid = decodeURIComponent(u.username || "");
    if (!isUuid(uuid)) return null;

    const host = u.hostname.replace(/^\[|\]$/g, "");
    const port = parsePort(u.port);
    if (!host || !isHost(u.hostname) || port === null) return null;

    const q = u.searchParams;
    if ((q.get("security") || "").toLowerCase() !== "reality") return null;
    if ((q.get("type") || "tcp").toLowerCase() !== "tcp") return null;

    const publicKey = q.get("pbk") || "";
    const shortId = q.get("sid") || "";
    const sni = q.get("sni") || q.get("host") || "";
    const fpRaw = (q.get("fp") || "chrome").toLowerCase();
    const fingerprint = FP_ALLOWED.has(fpRaw) ? fpRaw : "chrome";
    const flow = q.get("flow") || null;

    // Reality MUST have pbk + sni. shortId can technically be empty but most
    // real servers ship one; we require it to keep the pool DPI-grade.
    if (!publicKey || publicKey.length < 32) return null;
    if (!sni || !isHost(sni)) return null;
    if (!shortId || !/^[0-9a-fA-F]{2,16}$/.test(shortId)) return null;

    return {
      kind: "vless-reality",
      config: uri.trim(),
      host,
      port,
      uuid,
      publicKey,
      shortId: shortId.toLowerCase(),
      sni,
      fingerprint,
      flow,
      source,
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Shadowsocks-2022 parser
//   ss://base64(method:password)@host:port#tag
//   ss://method:password@host:port#tag        (SIP002 plain)
//   ss://base64(method:password@host:port)#tag
// Reject anything that's not a 2022-blake3 method.
// ---------------------------------------------------------------------------
function parseSs2022(uri: string, source: string): Ss2022Node | null {
  try {
    const trimmed = uri.trim();
    const hashIdx = trimmed.indexOf("#");
    const body = (hashIdx >= 0 ? trimmed.slice(0, hashIdx) : trimmed).slice("ss://".length);

    let method = "";
    let password = "";
    let host = "";
    let portStr = "";

    const atIdx = body.lastIndexOf("@");
    if (atIdx > 0) {
      // userinfo@host:port  (userinfo may be base64 or plain "method:password")
      const userinfoRaw = body.slice(0, atIdx);
      const hostPart = body.slice(atIdx + 1).split(/[/?]/)[0];
      const colon = hostPart.lastIndexOf(":");
      if (colon < 0) return null;
      host = hostPart.slice(0, colon).replace(/^\[|\]$/g, "");
      portStr = hostPart.slice(colon + 1);

      let userinfo = userinfoRaw;
      if (!userinfo.includes(":")) {
        const decoded = b64decode(userinfo);
        if (!decoded) return null;
        userinfo = decoded;
      }
      const sep = userinfo.indexOf(":");
      if (sep < 0) return null;
      method = userinfo.slice(0, sep).trim().toLowerCase();
      password = userinfo.slice(sep + 1);
    } else {
      // Fully base64-encoded "method:password@host:port"
      const decoded = b64decode(body.split(/[/?]/)[0]);
      if (!decoded) return null;
      const at = decoded.lastIndexOf("@");
      if (at < 0) return null;
      const userinfo = decoded.slice(0, at);
      const hostPart = decoded.slice(at + 1);
      const colon = hostPart.lastIndexOf(":");
      if (colon < 0) return null;
      host = hostPart.slice(0, colon).replace(/^\[|\]$/g, "");
      portStr = hostPart.slice(colon + 1);
      const sep = userinfo.indexOf(":");
      if (sep < 0) return null;
      method = userinfo.slice(0, sep).trim().toLowerCase();
      password = userinfo.slice(sep + 1);
    }

    if (!SS2022_METHODS.has(method)) return null;
    if (!password || password.length < 8) return null;

    const port = parsePort(portStr);
    if (!host || port === null) return null;
    if (!isHost(host) && !/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return null;

    // Re-emit a canonical ss:// URI so the native bridge gets a clean config.
    const canonicalUserinfo = btoa(`${method}:${password}`)
      .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    const config = `ss://${canonicalUserinfo}@${host}:${port}#ss2022`;

    return {
      kind: "shadowsocks-2022",
      config,
      host,
      port,
      method,
      password,
      source,
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Source fetching
// ---------------------------------------------------------------------------
async function fetchSource(src: Source): Promise<Node[]> {
  try {
    const res = await fetch(src.url, {
      headers: { "User-Agent": "TrivoVPN/2.0 (+server-discovery)" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      console.log(`[${src.id}] HTTP ${res.status}`);
      return [];
    }
    const raw = await res.text();
    const text = maybeDecodeSubscription(raw);

    const nodes: Node[] = [];
    for (const m of text.match(VLESS_RE) ?? []) {
      const n = parseVlessReality(m, src.id);
      if (n) nodes.push(n);
      if (nodes.length >= MAX_PER_SOURCE) break;
    }
    for (const m of text.match(SS_RE) ?? []) {
      if (nodes.length >= MAX_PER_SOURCE) break;
      const n = parseSs2022(m, src.id);
      if (n) nodes.push(n);
    }
    console.log(`[${src.id}] kept ${nodes.length} DPI-ready nodes`);
    return nodes;
  } catch (e) {
    console.log(`[${src.id}] fetch failed:`, (e as Error).message);
    return [];
  }
}

// ---------------------------------------------------------------------------
// GeoIP enrichment (best-effort, free ip-api batch endpoint)
// ---------------------------------------------------------------------------
type Geo = { country_code: string; country_name: string; city: string; flag: string };

function ccToFlag(cc: string): string {
  if (!cc || cc.length !== 2) return "🌐";
  const A = 0x1f1e6;
  return String.fromCodePoint(...[...cc.toUpperCase()].map((c) => A + c.charCodeAt(0) - 65));
}

async function geoBatch(hosts: string[]): Promise<Map<string, Geo>> {
  const out = new Map<string, Geo>();
  const unique = Array.from(new Set(hosts)).filter((h) => /^\d{1,3}(\.\d{1,3}){3}$/.test(h));
  if (unique.length === 0) return out;
  // ip-api batch accepts up to 100 entries per call.
  for (let i = 0; i < unique.length; i += 100) {
    const chunk = unique.slice(i, i + 100);
    try {
      const res = await fetch("http://ip-api.com/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(chunk.map((h) => ({ query: h, fields: "status,country,countryCode,city,query" }))),
        signal: AbortSignal.timeout(6000),
      });
      if (!res.ok) continue;
      const arr = await res.json() as Array<{ status: string; query: string; country?: string; countryCode?: string; city?: string }>;
      for (const r of arr) {
        if (r.status !== "success" || !r.countryCode) continue;
        out.set(r.query, {
          country_code: r.countryCode,
          country_name: r.country ?? r.countryCode,
          city: r.city ?? "",
          flag: ccToFlag(r.countryCode),
        });
      }
    } catch (e) {
      console.log("geo batch failed:", (e as Error).message);
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// TCP reachability probe
// ---------------------------------------------------------------------------
type Probe = { ok: boolean; latency_ms: number | null };

async function probeTcp(host: string, port: number): Promise<Probe> {
  const start = performance.now();
  try {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), PROBE_TIMEOUT_MS);
    const conn = await Deno.connect({ hostname: host, port });
    clearTimeout(timer);
    const latency = Math.round(performance.now() - start);
    try { conn.close(); } catch { /* noop */ }
    return { ok: true, latency_ms: latency };
  } catch {
    return { ok: false, latency_ms: null };
  }
}

async function probeAll(nodes: Node[]): Promise<Map<string, Probe>> {
  const result = new Map<string, Probe>();
  const queue = [...nodes];
  const workers = Array.from({ length: PROBE_CONCURRENCY }, async () => {
    while (queue.length) {
      const n = queue.shift();
      if (!n) break;
      const key = `${n.host}:${n.port}`;
      if (result.has(key)) continue;
      result.set(key, await probeTcp(n.host, n.port));
    }
  });
  await Promise.all(workers);
  return result;
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const startedAt = Date.now();
  console.log("scrape-servers (DPI edition): starting");

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // 1. Fan-out fetch
  const fetched = (await Promise.all(SOURCES.map(fetchSource))).flat();
  console.log(`Fetched ${fetched.length} DPI-ready candidates from ${SOURCES.length} sources`);

  // 2. Dedup by host:port (across protocols — same endpoint can't serve both)
  const dedup = new Map<string, Node>();
  for (const n of fetched) {
    const key = `${n.host}:${n.port}`;
    if (!dedup.has(key)) dedup.set(key, n);
  }
  const candidates = Array.from(dedup.values()).slice(0, MAX_PROBE_CANDIDATES);
  console.log(`Deduped to ${candidates.length} candidates`);

  // 3. Reachability probe
  const probes = await probeAll(candidates);
  const alive = candidates.filter((n) => probes.get(`${n.host}:${n.port}`)?.ok);
  console.log(`${alive.length}/${candidates.length} reachable`);

  // 4. GeoIP enrichment (IPv4 only — domains skipped to stay within free tier)
  const geo = await geoBatch(alive.map((n) => n.host));

  // 5. Build upsert rows. Protocol column matches DB CHECK constraint values.
  const now = new Date().toISOString();
  const rows = alive.map((n) => {
    const probe = probes.get(`${n.host}:${n.port}`);
    const g = geo.get(n.host);
    const base = {
      protocol: n.kind, // "vless-reality" | "shadowsocks-2022"
      config: n.config,
      host: n.host,
      port: n.port,
      country_code: g?.country_code ?? null,
      country_name: g?.country_name ?? null,
      city: g?.city ?? null,
      flag: g?.flag ?? "🌐",
      source: n.source,
      is_alive: true,
      latency_ms: probe?.latency_ms ?? null,
      last_validated_at: now,
      last_seen: now,
      // Reality-specific
      public_key: null as string | null,
      short_id: null as string | null,
      sni: null as string | null,
      fingerprint: null as string | null,
      flow: null as string | null,
      // SS2022-specific
      method: null as string | null,
      password: null as string | null,
    };
    if (n.kind === "vless-reality") {
      base.public_key = n.publicKey;
      base.short_id = n.shortId;
      base.sni = n.sni;
      base.fingerprint = n.fingerprint;
      base.flow = n.flow;
    } else {
      base.method = n.method;
      base.password = n.password;
    }
    return base;
  });

  // 6. Upsert in chunks to avoid statement-size limits
  let upserted = 0;
  const CHUNK = 100;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = rows.slice(i, i + CHUNK);
    const { error, count } = await supabase
      .from("servers")
      .upsert(slice, { onConflict: "host,port,protocol", count: "exact" });
    if (error) {
      console.log("upsert error:", error.message);
      return new Response(JSON.stringify({ ok: false, error: error.message }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }
    upserted += count ?? slice.length;
  }

  // 7. Mark stale rows (>6h since last_seen) as not alive
  const sixHoursAgo = new Date(Date.now() - 6 * 3600 * 1000).toISOString();
  await supabase
    .from("servers")
    .update({ is_alive: false })
    .lt("last_seen", sixHoursAgo);

  const took = Date.now() - startedAt;
  console.log(`scrape-servers: done in ${took}ms — upserted ${upserted}`);

  return new Response(
    JSON.stringify({
      ok: true,
      took_ms: took,
      sources: SOURCES.length,
      fetched: fetched.length,
      deduped: candidates.length,
      alive: alive.length,
      upserted,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
  );
});
