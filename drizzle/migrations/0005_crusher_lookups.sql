CREATE TABLE public.crusher_lookups (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  kind text not null check (kind in ('driver','serial','company','supplier')),
  name text not null,
  extra text,
  created_at timestamptz not null default now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crusher_lookups TO authenticated;
GRANT ALL ON public.crusher_lookups TO service_role;
ALTER TABLE public.crusher_lookups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members manage crusher lookups" ON public.crusher_lookups FOR ALL TO authenticated
USING (public.user_in_org(auth.uid(), organization_id)) WITH CHECK (public.user_in_org(auth.uid(), organization_id));
CREATE INDEX ON public.crusher_lookups (organization_id, kind);