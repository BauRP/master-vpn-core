-- Drop the legacy protocol whitelist FIRST so the UPDATE can run
ALTER TABLE public.servers DROP CONSTRAINT IF EXISTS servers_protocol_check;

ALTER TABLE public.servers
  ADD COLUMN IF NOT EXISTS public_key TEXT,
  ADD COLUMN IF NOT EXISTS short_id TEXT,
  ADD COLUMN IF NOT EXISTS sni TEXT,
  ADD COLUMN IF NOT EXISTS fingerprint TEXT DEFAULT 'chrome',
  ADD COLUMN IF NOT EXISTS flow TEXT,
  ADD COLUMN IF NOT EXISTS method TEXT,
  ADD COLUMN IF NOT EXISTS password TEXT;

UPDATE public.servers SET protocol = 'vless-reality' WHERE protocol = 'vless';
UPDATE public.servers SET protocol = 'shadowsocks-2022' WHERE protocol = 'shadowsocks';

-- Re-add the whitelist with DPI-resistant protocols only
ALTER TABLE public.servers
  ADD CONSTRAINT servers_protocol_check
  CHECK (protocol IN ('vless-reality', 'shadowsocks-2022'));

CREATE INDEX IF NOT EXISTS idx_servers_alive_protocol_latency
  ON public.servers (protocol, is_alive, latency_ms);