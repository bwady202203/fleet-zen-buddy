
CREATE TABLE public.zatca_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID,
  -- Company identity
  seller_name_ar TEXT,
  seller_name_en TEXT,
  vat_number TEXT,
  crn TEXT,
  -- Address (ZATCA required)
  street_name TEXT,
  building_number TEXT,
  plot_identification TEXT,
  district TEXT,
  city TEXT,
  postal_code TEXT,
  additional_number TEXT,
  country_code TEXT DEFAULT 'SA',
  -- Branding
  logo_url TEXT,
  -- Invoice numbering
  invoice_prefix TEXT DEFAULT 'INV',
  invoice_counter INTEGER NOT NULL DEFAULT 0,
  -- Environment
  environment TEXT NOT NULL DEFAULT 'sandbox' CHECK (environment IN ('sandbox','simulation','production')),
  -- Device / EGS
  device_common_name TEXT,
  device_serial_number TEXT,
  egs_model TEXT,
  -- Compliance flags
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.zatca_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view zatca settings"
ON public.zatca_settings FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins and accountants can manage zatca settings"
ON public.zatca_settings FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'accountant'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'accountant'::app_role));

CREATE TRIGGER zatca_settings_updated_at
BEFORE UPDATE ON public.zatca_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
