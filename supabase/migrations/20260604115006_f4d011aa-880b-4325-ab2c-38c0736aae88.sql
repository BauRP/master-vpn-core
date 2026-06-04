
CREATE TABLE public.trial_devices (
  device_uuid TEXT PRIMARY KEY,
  trial_start_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.trial_devices TO anon, authenticated;
GRANT ALL ON public.trial_devices TO service_role;

ALTER TABLE public.trial_devices ENABLE ROW LEVEL SECURITY;

-- Locked-down direct access; clients must go through register_trial().
CREATE POLICY "trial_devices no direct read"
  ON public.trial_devices FOR SELECT
  TO anon, authenticated
  USING (false);

CREATE POLICY "trial_devices no direct write"
  ON public.trial_devices FOR INSERT
  TO anon, authenticated
  WITH CHECK (false);

CREATE POLICY "trial_devices no direct update"
  ON public.trial_devices FOR UPDATE
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

CREATE OR REPLACE FUNCTION public.register_trial(_device_uuid TEXT)
RETURNS TABLE(trial_start_at TIMESTAMPTZ, server_now TIMESTAMPTZ, days_remaining INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start TIMESTAMPTZ;
BEGIN
  IF _device_uuid IS NULL OR length(_device_uuid) < 6 THEN
    RAISE EXCEPTION 'invalid device uuid';
  END IF;

  INSERT INTO public.trial_devices(device_uuid)
  VALUES (_device_uuid)
  ON CONFLICT (device_uuid) DO UPDATE
    SET last_seen_at = now()
  RETURNING public.trial_devices.trial_start_at INTO v_start;

  RETURN QUERY
  SELECT
    v_start,
    now() AS server_now,
    GREATEST(0, 7 - FLOOR(EXTRACT(EPOCH FROM (now() - v_start)) / 86400)::INT) AS days_remaining;
END;
$$;

GRANT EXECUTE ON FUNCTION public.register_trial(TEXT) TO anon, authenticated;
