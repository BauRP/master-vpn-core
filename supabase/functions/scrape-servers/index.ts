/**
 * scrape-servers — collects VLESS / Shadowsocks nodes from public sources,
 * enriches them with GeoIP info, probes reachability, and upserts into
 * the public.servers table.
 *
 * Designed to be invoked by pg_cron every 30 minutes. Safe to call ad-hoc.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SOURCES: { id: string; url: string; format: "csv" | "raw" | "base64" }[] = [
  // VPN Gate is OpenVPN-focused; kept here as a TCP-reachable endpoint pool
  // we ignore for protocol purposes. Disabled by default.
  // { id: "vpngate", url: "http://www.vpngate.net/api/iphone/", format: "csv" },

  // Public V2Ray / VLESS aggregators on raw GitHub. These return plain text
  // with one connection URI per line (or base64-encoded blocks).
  { id: "v2raycollector-vless", url: "https://raw.githubusercontent.com/MhdiTaheri/V2rayCollector/main/sub/Mix/vless.txt", format: "raw" },
  { id: "v2raycollector-ss", url: "https://raw.githubusercontent.com/MhdiTaheri/V2rayCollector/main/sub/Mix/ss.txt", format: "raw" },
  { id: "barry-far-vless", url: "https://raw.githubusercontent.com/barry-far/V2ray-Configs/main/Splitted-By-Protocol/vless.txt", format: "raw" },
  { id: "barry-far-ss", url: "https://raw.githubusercontent.com/barry-far/V2ray-Configs/main/Splitted-By-Protocol/ss.txt", format: "raw" },
  { id: "soroushmirzaei", url: "https://raw.githubusercontent.com/soroushmirzaei/telegram-configs-collector/main/protocols/vless", format: "raw" },
];

const VLESS_RE = /vless:\/\/[^ \s<>"']+/g;
const SS_RE = /ss:\/\/[^ \s<>"']+/g;

// Per-run caps — keep the table lean and the cron run fast.
const MAX_PER_SOURCE = 60;
const MAX_TOTAL = 200;
const PROBE_TIMEOUT_MS = 1500;
const PROBE_CONCURRENCY = 20;

type ParsedNode = {
  protocol: "vless" | "shadowsocks";
  config: string;
  host: string;
  port: number;
  source: string;
};

function parseVless(uri: string, source: string): ParsedNode | null {
  // vless://uuid@host:port?params#name
  try {
    const after = uri.slice("vless://".length);
    const at = after.indexOf("@");
    if (at < 0) return null;
    const hostPart = after.slice(at + 1).split(/[?#]/)[0];
    const [host, portStr] = hostPart.split(":");
    const port = Number(portStr);
    if (!host || !Number.isFinite(port) || port <= 0 || port > 65535) return null;
    return { protocol: "vless", config: uri.trim(), host, port, source };
  } catch {
    return null;
  }
}

function parseSs(uri: string, source: string): ParsedNode | null {
  // ss://base64(method:password)@host:port#name  OR  ss://base64(...)#name
  try {
    const after = uri.slice("ss://".length);
    const hashIdx = after.indexOf("#");
    const body = hashIdx >= 0 ? after.slice(0, hashIdx) : after;
    let hostPart: string;
    if (body.includes("@")) {
      hostPart = body.split("@")[1];
    } else {
      // Fully base64 — try to decode and find host:port
      try {
        const decoded = atob(body.replace(/-/g, "+").replace(/_/g, "/"));
        const at = decoded.indexOf("@");
        hostPart = at >= 0 ? decoded.slice(at + 1) : decoded;
      } catch {
        return null;
      }
    }
    const [host, portStr] = hostPart.split(/[/?]/)[0].split(":");
    const port = Number(portStr);
    if (!host || !Number.isFinite(port) || port <= 0 || port > 65535) return null;
    return { protocol: "shadowsocks", config: uri.trim(), host, port, source };
  } catch {
    return null;
  }
}

function maybeBase64Decode(text: string): string {
  const trimmed = text.trim();
  if (/^[A-Za-z0-9+/=_-]+$/.test(trimmed) && trimmed.length > 100) {
    try {
      return atob(trimmed.replace(/-/g, "+").replace(/_/g, "/"));
    } catch {
      return text;
    }
  }
  return text;
}

async function fetchSource(src: typeof SOURCES[number]): Promise<ParsedNode[]> {
  try {
    const res = await fetch(src.url, {
      headers: { "User-Agent": "MasterVPN/1.0 (+server-discovery)" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      console.log(`[${src.id}] HTTP ${res.status}`);
      return [];
    }
    const raw = await res.text();
    const text = maybeBase64Decode(raw);
    const nodes: ParsedNode[] = [];
    const vlessMatches = text.match(VLESS_RE) ?? [];
    const ssMatches = text.match(SS_RE) ?? [];
    for (const m of vlessMatches) {
      const p = parseVless(m, src.id);
      if (p) nodes.push(p);
    }
    for (const m of ssMatches) {
      const p = parseSs(m, src.id);
      if (p) nodes.push(p);
    }
    return nodes.slice(0, MAX_PER_SOURCE);
  } catch (e) {
    console.log(`[${src.id}] fetch failed:`, (e as Error).message);
    return [];
  }
}

async function geoLookupBatch(hosts: string[]): Promise<Map<string, { country_code: string; country_name: string; city: string; flag: string }>> {
  const out = new Map<string, { country_code: string; country_name: string; city: string; flag: string }>();
  if (hosts.length === 0) return out;
  const unique = Array.from(new Set(hosts)).slice(0, 100);
  try {
    const body = unique.map((h) => ({ query: h, fields: "status,country,countryCode,city,query" }));
    const res = await fetch("http://ip-api.com/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return out;
    const arr = await res.json() as Array<{ status: string; query: string; country?: string; countryCode?: string; city?: string }>;
    for (const r of arr) {
      if (r.status !== "success" || !r.countryCode) continue;
      out.set(r.query, {
        country_code: r.countryCode,
        country_name: r.country ?? r.countryCode,
        city: r.city ?? "",
        flag: countryCodeToFlag(r.countryCode),
      });
    }
  } catch (e) {
    console.log("geoLookup failed:", (e as Error).message);
  }
  return out;
}

function countryCodeToFlag(cc: string): string {
  if (!cc || cc.length !== 2) return "🌐";
  const A = 0x1f1e6;
  const codePoints = [...cc.toUpperCase()].map((c) => A + c.charCodeAt(0) - 65);
  return String.fromCodePoint(...codePoints);
}

async function probeTcp(host: string, port: number): Promise<{ ok: boolean; latency_ms: number | null }> {
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

async function probeAll(nodes: ParsedNode[]): Promise<Map<string, { ok: boolean; latency_ms: number | null }>> {
  const result = new Map<string, { ok: boolean; latency_ms: number | null }>();
  const queue = [...nodes];
  const workers = Array.from({ length: PROBE_CONCURRENCY }, async () => {
    while (queue.length) {
      const n = queue.shift();
      if (!n) break;
      const key = `${n.host}:${n.port}:${n.protocol}`;
      if (result.has(key)) continue;
      result.set(key, await probeTcp(n.host, n.port));
    }
  });
  await Promise.all(workers);
  return result;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const startedAt = Date.now();
  console.log("scrape-servers: starting");

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // 1. Fetch all sources in parallel
  const fetched = (await Promise.all(SOURCES.map(fetchSource))).flat();
  console.log(`Fetched ${fetched.length} candidate URIs from ${SOURCES.length} sources`);

  // 2. Dedup by host+port+protocol, keeping first occurrence (preferred source order)
  const dedup = new Map<string, ParsedNode>();
  for (const n of fetched) {
    const key = `${n.host}:${n.port}:${n.protocol}`;
    if (!dedup.has(key)) dedup.set(key, n);
  }
  const candidates = Array.from(dedup.values()).slice(0, MAX_TOTAL);
  console.log(`Deduped to ${candidates.length} candidates`);

  // 3. Probe TCP reachability
  const probes = await probeAll(candidates);
  const alive = candidates.filter((n) => probes.get(`${n.host}:${n.port}:${n.protocol}`)?.ok);
  console.log(`${alive.length}/${candidates.length} reachable`);

  // 4. GeoIP enrichment for alive hosts only
  const geo = await geoLookupBatch(alive.map((n) => n.host));

  // 5. Build upsert rows
  const now = new Date().toISOString();
  const rows = alive.map((n) => {
    const probe = probes.get(`${n.host}:${n.port}:${n.protocol}`);
    const g = geo.get(n.host);
    return {
      protocol: n.protocol,
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
    };
  });

  // 6. Upsert
  let inserted = 0;
  if (rows.length > 0) {
    const { error, count } = await supabase
      .from("servers")
      .upsert(rows, { onConflict: "host,port,protocol", count: "exact" });
    if (error) {
      console.log("upsert error:", error.message);
      return new Response(JSON.stringify({ ok: false, error: error.message }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }
    inserted = count ?? rows.length;
  }

  // 7. Mark stale rows (not seen in 6h) as not alive
  const sixHoursAgo = new Date(Date.now() - 6 * 3600 * 1000).toISOString();
  await supabase
    .from("servers")
    .update({ is_alive: false })
    .lt("last_seen", sixHoursAgo);

  const took = Date.now() - startedAt;
  console.log(`scrape-servers: done in ${took}ms — ${inserted} rows`);

  return new Response(
    JSON.stringify({
      ok: true,
      took_ms: took,
      fetched: fetched.length,
      deduped: candidates.length,
      alive: alive.length,
      upserted: inserted,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
  );
});
