CREATE TABLE public.crusher_shipments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  establishment text,
  entry_at timestamptz NOT NULL DEFAULT now(),
  exit_at timestamptz,
  material_type text,
  client_name text,
  kilometers numeric DEFAULT 0,
  driver_name text,
  shipment_number text,
  supplier_name text,
  invoice_number text NOT NULL,
  invoice_value numeric DEFAULT 0,
  previous_serial text NOT NULL,
  serial_number text,
  invoice_pdf_path text NOT NULL,
  empty_weight numeric DEFAULT 0,
  full_weight numeric DEFAULT 0,
  net_weight numeric GENERATED ALWAYS AS (COALESCE(full_weight,0) - COALESCE(empty_weight,0)) STORED,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crusher_shipments TO authenticated;
GRANT ALL ON public.crusher_shipments TO service_role;
ALTER TABLE public.crusher_shipments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members manage crusher shipments" ON public.crusher_shipments FOR ALL TO authenticated
USING (public.user_in_org(auth.uid(), organization_id)) WITH CHECK (public.user_in_org(auth.uid(), organization_id));

CREATE OR REPLACE FUNCTION public.assign_crusher_serial() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.previous_serial ~ '^[0-9]+$' THEN
    NEW.serial_number := lpad((NEW.previous_serial::bigint + 1)::text, length(NEW.previous_serial), '0');
  ELSE
    NEW.serial_number := NEW.previous_serial || '-1';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_crusher_serial BEFORE INSERT ON public.crusher_shipments FOR EACH ROW EXECUTE FUNCTION public.assign_crusher_serial();

INSERT INTO storage.objects (bucket_id, name) SELECT 'x','x' WHERE false;
CREATE POLICY "crusher pdf upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'crusher-invoices');
CREATE POLICY "crusher pdf read" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'crusher-invoices');