CREATE TABLE public.global_material_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid,
  load_type_id uuid NOT NULL REFERENCES public.load_types(id) ON DELETE CASCADE,
  cost_price numeric NOT NULL DEFAULT 0,
  sale_price numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX global_material_prices_unique ON public.global_material_prices (organization_id, load_type_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.global_material_prices TO authenticated;
GRANT ALL ON public.global_material_prices TO service_role;
ALTER TABLE public.global_material_prices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members manage global material prices" ON public.global_material_prices FOR ALL TO authenticated USING (organization_id IS NULL OR public.user_in_org(auth.uid(), organization_id)) WITH CHECK (organization_id IS NULL OR public.user_in_org(auth.uid(), organization_id));
CREATE TRIGGER update_global_material_prices_updated_at BEFORE UPDATE ON public.global_material_prices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.period_cost_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid,
  cost_type text NOT NULL CHECK (cost_type IN ('maintenance','payroll')),
  start_date date NOT NULL,
  end_date date NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX period_cost_entries_type_dates ON public.period_cost_entries (cost_type, start_date, end_date);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.period_cost_entries TO authenticated;
GRANT ALL ON public.period_cost_entries TO service_role;
ALTER TABLE public.period_cost_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members manage period costs" ON public.period_cost_entries FOR ALL TO authenticated USING (organization_id IS NULL OR public.user_in_org(auth.uid(), organization_id)) WITH CHECK (organization_id IS NULL OR public.user_in_org(auth.uid(), organization_id));
CREATE TRIGGER update_period_cost_entries_updated_at BEFORE UPDATE ON public.period_cost_entries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();