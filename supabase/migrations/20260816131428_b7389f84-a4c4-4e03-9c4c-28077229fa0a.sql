CREATE TABLE IF NOT EXISTS public.delivery_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.delivery_locations TO authenticated;
GRANT ALL ON public.delivery_locations TO service_role;

ALTER TABLE public.delivery_locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can view delivery locations" ON public.delivery_locations;
CREATE POLICY "Authenticated can view delivery locations" ON public.delivery_locations FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated can insert delivery locations" ON public.delivery_locations;
CREATE POLICY "Authenticated can insert delivery locations" ON public.delivery_locations FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated can update delivery locations" ON public.delivery_locations;
CREATE POLICY "Authenticated can update delivery locations" ON public.delivery_locations FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated can delete delivery locations" ON public.delivery_locations;
CREATE POLICY "Authenticated can delete delivery locations" ON public.delivery_locations FOR DELETE TO authenticated USING (true);