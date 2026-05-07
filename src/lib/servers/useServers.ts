/**
 * useServers — production live node catalog.
 *
 * Source of truth: the `servers` table in Lovable Cloud (Postgres). The
 * Android scraper worker + the `scrape-servers` edge function continuously
 * upsert real VLESS / Shadowsocks endpoints (host, port, country, latency)
 * into this table — no mocks, no placeholder JSON.
 *
 * This module:
 *   1. Performs the initial fetch (`supabase.from("servers").select(...)`).
 *   2. Subscribes to a Postgres realtime channel so the UI updates the
 *      moment a row is inserted / updated / deleted in the cloud DB
 *      (functionally equivalent to a Firebase RTDB `onValue` listener).
 */
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type ServerRow = {
  id: string;
  protocol: "vless" | "shadowsocks";
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
};

async function fetchServers(): Promise<{ servers: ServerRow[]; source: "live" | "rescue" }> {
  // Try live first
  const { data: live, error: liveErr } = await supabase
    .from("servers")
    .select("*")
    .eq("is_alive", true)
    .order("latency_ms", { ascending: true, nullsFirst: false })
    .limit(50);

  if (liveErr) throw liveErr;
  if (live && live.length > 0) {
    return { servers: live as ServerRow[], source: "live" };
  }

  // Fall back to rescue rows
  const { data: rescue, error: rescueErr } = await supabase
    .from("servers")
    .select("*")
    .eq("source", "rescue")
    .limit(20);

  if (rescueErr) throw rescueErr;
  return { servers: (rescue ?? []) as ServerRow[], source: "rescue" };
}

export function useServers() {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["servers"],
    queryFn: fetchServers,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  // Realtime listener — equivalent to Firebase `onValue(ref('nodes'), ...)`.
  // Any insert/update/delete on `public.servers` triggers a refetch so the
  // dashboard reflects the live cloud state without manual reload.
  useEffect(() => {
    const channel = supabase
      .channel("servers-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "servers" },
        () => {
          qc.invalidateQueries({ queryKey: ["servers"] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);

  return query;
}

/** Trigger a fresh scrape on demand (no-await safe). */
export async function triggerScrape(): Promise<void> {
  try {
    await supabase.functions.invoke("scrape-servers", { body: {} });
  } catch (e) {
    console.warn("scrape-servers invoke failed:", e);
  }
}
