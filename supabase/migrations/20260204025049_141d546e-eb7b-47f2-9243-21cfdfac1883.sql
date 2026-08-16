-- Enable realtime for matches table so users can receive match notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.matches;