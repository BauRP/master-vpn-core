/**
 * rescue-list — returns curated fallback servers when the live catalog is empty
 * or the scraper is degraded. Read-only. Safe for unauthenticated clients.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Prefer live alive entries; if empty, fall back to rescue-tagged rows.
  const { data: live, error: liveErr } = await supabase
    .from("servers")
    .select("*")
    .eq("is_alive", true)
    .order("latency_ms", { ascending: true, nullsFirst: false })
    .limit(50);

  if (liveErr) {
    return new Response(JSON.stringify({ ok: false, error: liveErr.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }

  if (live && live.length > 0) {
    return new Response(JSON.stringify({ ok: true, source: "live", servers: live }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  }

  const { data: rescue, error: rescueErr } = await supabase
    .from("servers")
    .select("*")
    .eq("source", "rescue")
    .limit(20);

  if (rescueErr) {
    return new Response(JSON.stringify({ ok: false, error: rescueErr.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }

  return new Response(JSON.stringify({ ok: true, source: "rescue", servers: rescue ?? [] }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: 200,
  });
});
