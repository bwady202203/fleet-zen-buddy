
-- Add iqama fields to drivers
ALTER TABLE public.drivers
  ADD COLUMN IF NOT EXISTS iqama_number text,
  ADD COLUMN IF NOT EXISTS iqama_expiry date;

-- Useful links table
CREATE TABLE IF NOT EXISTS public.useful_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  url text NOT NULL,
  description text,
  icon text,
  color text,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.useful_links TO authenticated;
GRANT ALL ON public.useful_links TO service_role;

ALTER TABLE public.useful_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view org useful_links" ON public.useful_links
  FOR SELECT TO authenticated
  USING (organization_id IS NULL OR organization_id = public.get_user_organization(auth.uid()));

CREATE POLICY "Users manage org useful_links" ON public.useful_links
  FOR ALL TO authenticated
  USING (organization_id IS NULL OR organization_id = public.get_user_organization(auth.uid()))
  WITH CHECK (organization_id IS NULL OR organization_id = public.get_user_organization(auth.uid()));

CREATE TRIGGER update_useful_links_updated_at BEFORE UPDATE ON public.useful_links
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
