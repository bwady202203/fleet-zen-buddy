-- Create loads_reports table for company-based load reports
CREATE TABLE IF NOT EXISTS public.loads_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  report_date DATE NOT NULL DEFAULT CURRENT_DATE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_loads INTEGER NOT NULL DEFAULT 0,
  total_quantity NUMERIC NOT NULL DEFAULT 0,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  average_load_amount NUMERIC NOT NULL DEFAULT 0,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  notes TEXT
);

-- Enable RLS
ALTER TABLE public.loads_reports ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their organization loads reports"
ON public.loads_reports
FOR SELECT
USING (
  organization_id IS NULL OR 
  organization_id = get_user_organization(auth.uid())
);

CREATE POLICY "Users can manage their organization loads reports"
ON public.loads_reports
FOR ALL
USING (
  organization_id IS NULL OR 
  organization_id = get_user_organization(auth.uid()) OR
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role)
)
WITH CHECK (
  organization_id IS NULL OR 
  organization_id = get_user_organization(auth.uid())
);

-- Create index for better performance
CREATE INDEX idx_loads_reports_company_id ON public.loads_reports(company_id);
CREATE INDEX idx_loads_reports_dates ON public.loads_reports(start_date, end_date);
CREATE INDEX idx_loads_reports_organization ON public.loads_reports(organization_id);

-- Create function to generate/update loads report
CREATE OR REPLACE FUNCTION public.generate_loads_report(
  p_company_id UUID,
  p_start_date DATE,
  p_end_date DATE,
  p_organization_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_report_id UUID;
  v_total_loads INTEGER;
  v_total_quantity NUMERIC;
  v_total_amount NUMERIC;
  v_avg_amount NUMERIC;
BEGIN
  -- Calculate statistics from loads table
  SELECT 
    COUNT(*),
    COALESCE(SUM(quantity), 0),
    COALESCE(SUM(total_amount), 0),
    COALESCE(AVG(total_amount), 0)
  INTO 
    v_total_loads,
    v_total_quantity,
    v_total_amount,
    v_avg_amount
  FROM public.loads
  WHERE company_id = p_company_id
    AND date >= p_start_date
    AND date <= p_end_date
    AND (p_organization_id IS NULL OR organization_id = p_organization_id);

  -- Insert or update report
  INSERT INTO public.loads_reports (
    company_id,
    start_date,
    end_date,
    total_loads,
    total_quantity,
    total_amount,
    average_load_amount,
    organization_id
  ) VALUES (
    p_company_id,
    p_start_date,
    p_end_date,
    v_total_loads,
    v_total_quantity,
    v_total_amount,
    v_avg_amount,
    p_organization_id
  )
  ON CONFLICT ON CONSTRAINT loads_reports_pkey
  DO UPDATE SET
    total_loads = v_total_loads,
    total_quantity = v_total_quantity,
    total_amount = v_total_amount,
    average_load_amount = v_avg_amount,
    updated_at = now()
  RETURNING id INTO v_report_id;

  RETURN v_report_id;
END;
$$;

-- Create trigger to update updated_at
CREATE TRIGGER update_loads_reports_updated_at
BEFORE UPDATE ON public.loads_reports
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add comment
COMMENT ON TABLE public.loads_reports IS 'تقارير الشحنات حسب الشركة - Company-based loads reports';