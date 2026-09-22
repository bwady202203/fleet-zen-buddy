CREATE TABLE public.diesel_records (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid,
  date date NOT NULL DEFAULT CURRENT_DATE,
  driver_id uuid REFERENCES public.drivers(id) ON DELETE SET NULL,
  liters numeric NOT NULL DEFAULT 0,
  amount numeric NOT NULL DEFAULT 0,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.diesel_records TO authenticated;
GRANT ALL ON public.diesel_records TO service_role;

ALTER TABLE public.diesel_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view diesel records"
ON public.diesel_records FOR SELECT TO authenticated
USING (organization_id IS NULL OR public.user_in_org(auth.uid(), organization_id));

CREATE POLICY "Org members can manage diesel records"
ON public.diesel_records FOR ALL TO authenticated
USING (organization_id IS NULL OR public.user_in_org(auth.uid(), organization_id))
WITH CHECK (organization_id IS NULL OR public.user_in_org(auth.uid(), organization_id));

CREATE INDEX idx_diesel_records_date ON public.diesel_records(date);
CREATE INDEX idx_diesel_records_driver ON public.diesel_records(driver_id);

CREATE TRIGGER update_diesel_records_updated_at
BEFORE UPDATE ON public.diesel_records
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();