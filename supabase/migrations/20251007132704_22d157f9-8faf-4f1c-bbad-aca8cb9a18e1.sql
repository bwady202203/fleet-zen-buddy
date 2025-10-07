-- إنشاء جدول لربط الشركات بأنواع الشحنات والأسعار
CREATE TABLE IF NOT EXISTS public.company_load_type_prices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  load_type_id UUID NOT NULL REFERENCES public.load_types(id) ON DELETE CASCADE,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(company_id, load_type_id)
);

-- Enable RLS
ALTER TABLE public.company_load_type_prices ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins and managers can manage company prices"
ON public.company_load_type_prices
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

CREATE POLICY "Authenticated users can view company prices"
ON public.company_load_type_prices
FOR SELECT
TO authenticated
USING (true);

-- Add trigger for updated_at
CREATE TRIGGER update_company_load_type_prices_updated_at
BEFORE UPDATE ON public.company_load_type_prices
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster queries
CREATE INDEX idx_company_load_type_prices_company ON public.company_load_type_prices(company_id);
CREATE INDEX idx_company_load_type_prices_load_type ON public.company_load_type_prices(load_type_id);