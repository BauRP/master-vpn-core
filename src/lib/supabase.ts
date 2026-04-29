import { createClient } from "@supabase/supabase-js";

/**
 * Master VPN — external Supabase instance.
 * Project URL is hardcoded per deployment spec.
 * Paste your anon key into VITE_SUPABASE_ANON_KEY (Vite env var) — never commit it.
 */
export const SUPABASE_URL = "https://uztkqhxgqxammuzowxme.supabase.co";

const ANON_KEY =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? "";

export const supabase = createClient(SUPABASE_URL, ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

export const hasSupabaseKey = ANON_KEY.length > 0;
