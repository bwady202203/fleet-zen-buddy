CREATE TABLE public.transport_loads (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 organization_id uuid NOT NULL REFERENCES public.organizations(id),
 created_by uuid NOT NULL DEFAULT auth.uid(),
 supplier_name text NOT NULL CHECK (length(btrim(supplier_name)) > 0),
 commission numeric(14,2) NOT NULL CHECK (commission >= 0),
 delivery_weight numeric(14,3) NOT NULL CHECK (delivery_weight > 0),
 driver_name text NOT NULL CHECK (length(btrim(driver_name)) > 0),
 vehicle_number text NOT NULL CHECK (length(btrim(vehicle_number)) > 0),
 invoice_number text NOT NULL CHECK (length(btrim(invoice_number)) > 0),
 delivery_date date NOT NULL,
 loading_date date NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.transport_loads TO authenticated;
GRANT ALL ON public.transport_loads TO service_role;
ALTER TABLE public.transport_loads ENABLE ROW LEVEL SECURITY;
CREATE POLICY transport_loads_select ON public.transport_loads FOR SELECT TO authenticated USING (
 EXISTS (SELECT 1 FROM public.user_organizations uo WHERE uo.user_id = auth.uid() AND uo.organization_id = transport_loads.organization_id)
 AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR EXISTS (SELECT 1 FROM public.user_module_permissions p WHERE p.user_id = auth.uid() AND p.module_name = 'loads' AND p.can_view = true))
);
CREATE POLICY transport_loads_insert ON public.transport_loads FOR INSERT TO authenticated WITH CHECK (
 created_by = auth.uid()
 AND EXISTS (SELECT 1 FROM public.user_organizations uo WHERE uo.user_id = auth.uid() AND uo.organization_id = transport_loads.organization_id)
 AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR EXISTS (SELECT 1 FROM public.user_module_permissions p WHERE p.user_id = auth.uid() AND p.module_name = 'loads' AND p.can_create = true))
);
CREATE INDEX transport_loads_org_created_idx ON public.transport_loads(organization_id, created_at DESC, id DESC);