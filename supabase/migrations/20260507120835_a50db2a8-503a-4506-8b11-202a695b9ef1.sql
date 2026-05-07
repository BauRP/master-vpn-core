ALTER TABLE public.servers REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.servers;