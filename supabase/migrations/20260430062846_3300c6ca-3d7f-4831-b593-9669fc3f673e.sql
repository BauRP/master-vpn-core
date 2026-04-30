-- Server catalog populated by background scrapers
CREATE TABLE public.servers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  protocol TEXT NOT NULL CHECK (protocol IN ('vless', 'shadowsocks')),
  config TEXT NOT NULL,
  host TEXT NOT NULL,
  port INTEGER NOT NULL,
  country_code TEXT,
  country_name TEXT,
  city TEXT,
  flag TEXT,
  source TEXT NOT NULL,
  is_alive BOOLEAN NOT NULL DEFAULT true,
  latency_ms INTEGER,
  last_validated_at TIMESTAMP WITH TIME ZONE,
  last_seen TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (host, port, protocol)
);

CREATE INDEX idx_servers_alive ON public.servers (is_alive, latency_ms NULLS LAST);
CREATE INDEX idx_servers_country ON public.servers (country_code);
CREATE INDEX idx_servers_source ON public.servers (source);

ALTER TABLE public.servers ENABLE ROW LEVEL SECURITY;

-- Public read: this is a catalog, not user data
CREATE POLICY "Anyone can view alive servers"
ON public.servers
FOR SELECT
USING (true);

-- No client writes. Edge functions use service role and bypass RLS.