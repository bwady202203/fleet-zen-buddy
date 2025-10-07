-- إنشاء enum لأنواع العمولات
CREATE TYPE public.driver_commission_type AS ENUM (
  'fixed',
  'weight_less_40',
  'weight_40_44',
  'weight_44_49',
  'weight_more_49'
);

-- إنشاء جدول عمولات السائقين لكل شركة
CREATE TABLE IF NOT EXISTS public.company_driver_commissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  commission_type driver_commission_type NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(company_id, commission_type)
);

-- Enable RLS
ALTER TABLE public.company_driver_commissions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins and managers can manage driver commissions"
ON public.company_driver_commissions
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

CREATE POLICY "Authenticated users can view driver commissions"
ON public.company_driver_commissions
FOR SELECT
TO authenticated
USING (true);

-- Add trigger for updated_at
CREATE TRIGGER update_company_driver_commissions_updated_at
BEFORE UPDATE ON public.company_driver_commissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster queries
CREATE INDEX idx_company_driver_commissions_company ON public.company_driver_commissions(company_id);