/**
 * useServers — fetches the live server catalog from Lovable Cloud,
 * with rescue-list fallback when the live pool is empty.
 *
 * Returns rows from the `servers` table sorted by latency.
 */
import { useQuery } from "@tanstack/react-query";
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
  return useQuery({
    queryKey: ["servers"],
    queryFn: fetchServers,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}

/** Trigger a fresh scrape on demand (no-await safe). */
export async function triggerScrape(): Promise<void> {
  try {
    await supabase.functions.invoke("scrape-servers", { body: {} });
  } catch (e) {
    console.warn("scrape-servers invoke failed:", e);
  }
}
