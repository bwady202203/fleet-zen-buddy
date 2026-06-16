CREATE TABLE public.establishments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.establishments TO authenticated;
GRANT SELECT ON public.establishments TO anon;
GRANT ALL ON public.establishments TO service_role;
ALTER TABLE public.establishments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view establishments" ON public.establishments FOR SELECT USING (true);
CREATE POLICY "Authenticated can insert establishments" ON public.establishments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can delete establishments" ON public.establishments FOR DELETE TO authenticated USING (true);