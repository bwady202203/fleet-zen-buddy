CREATE TABLE public.transport_load_contacts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 organization_id uuid NOT NULL REFERENCES public.organizations(id),
 created_by uuid NOT NULL DEFAULT auth.uid(),
 kind text NOT NULL CHECK (kind IN ('supplier','driver')),
 name text NOT NULL CHECK (length(btrim(name)) > 0),
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(organization_id, kind, name)
);
GRANT SELECT, INSERT ON public.transport_load_contacts TO authenticated;
GRANT ALL ON public.transport_load_contacts TO service_role;
ALTER TABLE public.transport_load_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY transport_contacts_select ON public.transport_load_contacts FOR SELECT TO authenticated USING (
 EXISTS (SELECT 1 FROM public.user_organizations uo WHERE uo.user_id = auth.uid() AND uo.organization_id = transport_load_contacts.organization_id)
 AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR EXISTS (SELECT 1 FROM public.user_module_permissions p WHERE p.user_id = auth.uid() AND p.module_name = 'loads' AND p.can_view = true))
);
CREATE POLICY transport_contacts_insert ON public.transport_load_contacts FOR INSERT TO authenticated WITH CHECK (
 created_by = auth.uid() AND EXISTS (SELECT 1 FROM public.user_organizations uo WHERE uo.user_id = auth.uid() AND uo.organization_id = transport_load_contacts.organization_id)
 AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR EXISTS (SELECT 1 FROM public.user_module_permissions p WHERE p.user_id = auth.uid() AND p.module_name = 'loads' AND p.can_create = true))
);
CREATE INDEX transport_contacts_org_kind_idx ON public.transport_load_contacts(organization_id, kind, name);