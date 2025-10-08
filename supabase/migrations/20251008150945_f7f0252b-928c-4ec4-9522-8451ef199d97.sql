-- Create company settings table
CREATE TABLE IF NOT EXISTS public.company_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL DEFAULT 'شركة الرمال الصناعية',
  tax_number TEXT,
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view company settings"
  ON public.company_settings
  FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage company settings"
  ON public.company_settings
  FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- Insert default settings
INSERT INTO public.company_settings (company_name, tax_number, address)
VALUES ('شركة الرمال الصناعية', '', '')
ON CONFLICT DO NOTHING;

-- Add trigger for updated_at
CREATE TRIGGER update_company_settings_updated_at
  BEFORE UPDATE ON public.company_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();