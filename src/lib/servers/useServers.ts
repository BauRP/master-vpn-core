/**
 * useServers — production live node catalog (DPI-bypass only).
 *
 * Source of truth: the `servers` table in Lovable Cloud (Postgres). The
 * Android scraper worker + the `scrape-servers` edge function continuously
 * upsert real endpoints into this table. We only ever surface rows that
 * carry a complete DPI-resistant configuration:
 *
 *   - VLESS-Reality  → must have `public_key`, `short_id`, `sni`.
 *   - Shadowsocks-2022 → must have `method` + `password`.
 *
 * Bare `vless` and legacy AEAD `shadowsocks` are intentionally filtered
 * out, even if the scraper writes them — they are reliably blocked by
 * carrier DPI and would only produce false-positive "alive" rows.
 *
 * Realtime: subscribed to a Postgres realtime channel so the UI updates
 * the moment a row is inserted / updated / deleted in the cloud DB.
 */
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** Only DPI-resistant transports are valid in the UI. */
export type DpiProtocol = "vless-reality" | "shadowsocks-2022";

export type ServerRow = {
  id: string;
  protocol: DpiProtocol;
  config: string;
  host: string;
  port: number;
  country_code: string | null;
  country_name: string | null;
  city: string | null;
  flag: string | null;
  source: string;
  is_alive: boolean;
  latency_ms: number | null;
  last_validated_at: string | null;
  last_seen: string;
  created_at: string;
  // ---- DPI-bypass material (required, presence depends on protocol) ----
  /** VLESS-Reality: X25519 public key (base64-url). */
  public_key: string | null;
  /** VLESS-Reality: Short ID (hex). */
  short_id: string | null;
  /** VLESS-Reality: SNI domain mimicked in the TLS ClientHello. */
  sni: string | null;
  /** VLESS-Reality: ClientHello fingerprint preset. */
  fingerprint: string | null;
  /** VLESS-Reality: optional XTLS flow (e.g. xtls-rprx-vision). */
  flow: string | null;
  /** Shadowsocks-2022: cipher (e.g. 2022-blake3-aes-256-gcm). */
  method: string | null;
  /** Shadowsocks-2022: base64 PSK. */
  password: string | null;
};

/** True only when the row has every field required by its protocol. */
function isDpiReady(row: ServerRow): boolean {
  if (row.protocol === "vless-reality") {
    return !!(row.public_key && row.short_id && row.sni);
  }
  if (row.protocol === "shadowsocks-2022") {
    return !!(row.method && row.password);
  }
  return false;
}

async function fetchServers(): Promise<{ servers: ServerRow[]; source: "live" | "rescue" }> {
  // Live, alive, DPI-ready. Filter by protocol whitelist server-side so
  // we don't waste bandwidth pulling rows we'd discard locally.
  const { data: live, error: liveErr } = await supabase
    .from("servers")
    .select("*")
    .eq("is_alive", true)
    .in("protocol", ["vless-reality", "shadowsocks-2022"])
    .order("latency_ms", { ascending: true, nullsFirst: false })
    .limit(50);

  if (liveErr) throw liveErr;
  const liveReady = ((live ?? []) as ServerRow[]).filter(isDpiReady);
  if (liveReady.length > 0) {
    return { servers: liveReady, source: "live" };
  }

  // Rescue rows: still must satisfy DPI-ready check. A rescue row that
  // lacks Reality keys is useless on a censored network — drop it.
  const { data: rescue, error: rescueErr } = await supabase
    .from("servers")
    .select("*")
    .eq("source", "rescue")
    .in("protocol", ["vless-reality", "shadowsocks-2022"])
    .limit(20);

  if (rescueErr) throw rescueErr;
  const rescueReady = ((rescue ?? []) as ServerRow[]).filter(isDpiReady);
  return { servers: rescueReady, source: "rescue" };
}

const CACHE_KEY = "trivo:servers:v2"; // v2: DPI-bypass schema

function readCache(): ServerRow[] | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ServerRow[]) : null;
  } catch {
    return null;
  }
}

function writeCache(rows: ServerRow[]) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(rows));
  } catch {
    /* quota / private mode — non-fatal */
  }
}

export function useServers() {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["servers", "dpi-v2"],
    queryFn: async () => {
      const result = await fetchServers();
      writeCache(result.servers);
      return result;
    },
    placeholderData: () => {
      const cached = readCache();
      return cached ? { servers: cached, source: "live" as const } : undefined;
    },
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    const channel = supabase.channel(`servers-live-${Math.random().toString(36).slice(2)}`);
    channel
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "servers" },
        () => {
          qc.invalidateQueries({ queryKey: ["servers", "dpi-v2"] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);

  // First-load sync indicator: true only while we have no data at all
  // (neither network response nor localStorage cache). Drives the
  // "Wait, Syncing…" state on the Connect button.
  const isSyncing = query.isPending && !query.data;
  return Object.assign(query, { isSyncing });
}

/** Trigger a fresh scrape on demand (no-await safe). */
export async function triggerScrape(): Promise<void> {
  try {
    await supabase.functions.invoke("scrape-servers", { body: {} });
  } catch (e) {
    console.warn("scrape-servers invoke failed:", e);
  }
}
