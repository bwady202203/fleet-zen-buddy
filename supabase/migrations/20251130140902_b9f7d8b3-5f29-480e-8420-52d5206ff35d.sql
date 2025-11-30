-- Create tables for reports summaries

-- Company loads summary report table
CREATE TABLE IF NOT EXISTS public.company_loads_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  report_date DATE NOT NULL,
  total_loads INTEGER DEFAULT 0,
  total_quantity NUMERIC DEFAULT 0,
  total_amount NUMERIC DEFAULT 0,
  organization_id UUID REFERENCES public.organizations(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, report_date, organization_id)
);

-- Driver commissions summary report table
CREATE TABLE IF NOT EXISTS public.driver_commissions_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID REFERENCES public.drivers(id) ON DELETE CASCADE,
  report_date DATE NOT NULL,
  total_loads INTEGER DEFAULT 0,
  total_commissions NUMERIC DEFAULT 0,
  total_amount NUMERIC DEFAULT 0,
  organization_id UUID REFERENCES public.organizations(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(driver_id, report_date, organization_id)
);

-- Enable RLS
ALTER TABLE public.company_loads_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_commissions_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies for company_loads_reports
CREATE POLICY "Users can view their organization company reports"
  ON public.company_loads_reports FOR SELECT
  USING (organization_id IS NULL OR organization_id = get_user_organization(auth.uid()));

CREATE POLICY "Users can manage their organization company reports"
  ON public.company_loads_reports FOR ALL
  USING (organization_id IS NULL OR organization_id = get_user_organization(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
  WITH CHECK (organization_id IS NULL OR organization_id = get_user_organization(auth.uid()));

-- RLS Policies for driver_commissions_reports
CREATE POLICY "Users can view their organization driver reports"
  ON public.driver_commissions_reports FOR SELECT
  USING (organization_id IS NULL OR organization_id = get_user_organization(auth.uid()));

CREATE POLICY "Users can manage their organization driver reports"
  ON public.driver_commissions_reports FOR ALL
  USING (organization_id IS NULL OR organization_id = get_user_organization(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
  WITH CHECK (organization_id IS NULL OR organization_id = get_user_organization(auth.uid()));

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_company_loads_reports_date ON public.company_loads_reports(report_date);
CREATE INDEX IF NOT EXISTS idx_company_loads_reports_company ON public.company_loads_reports(company_id);
CREATE INDEX IF NOT EXISTS idx_driver_commissions_reports_date ON public.driver_commissions_reports(report_date);
CREATE INDEX IF NOT EXISTS idx_driver_commissions_reports_driver ON public.driver_commissions_reports(driver_id);

-- Function to generate company loads report for a specific date
CREATE OR REPLACE FUNCTION generate_company_loads_report(p_report_date DATE, p_organization_id UUID DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete existing reports for this date
  DELETE FROM public.company_loads_reports 
  WHERE report_date = p_report_date 
    AND (p_organization_id IS NULL OR organization_id = p_organization_id);
  
  -- Insert new aggregated data
  INSERT INTO public.company_loads_reports (
    company_id, report_date, total_loads, total_quantity, total_amount, organization_id
  )
  SELECT 
    l.company_id,
    p_report_date,
    COUNT(*)::INTEGER as total_loads,
    COALESCE(SUM(l.quantity), 0) as total_quantity,
    COALESCE(SUM(l.total_amount), 0) as total_amount,
    l.organization_id
  FROM public.loads l
  WHERE l.date = p_report_date
    AND (p_organization_id IS NULL OR l.organization_id = p_organization_id)
    AND l.company_id IS NOT NULL
  GROUP BY l.company_id, l.organization_id;
END;
$$;

-- Function to generate driver commissions report for a specific date
CREATE OR REPLACE FUNCTION generate_driver_commissions_report(p_report_date DATE, p_organization_id UUID DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete existing reports for this date
  DELETE FROM public.driver_commissions_reports 
  WHERE report_date = p_report_date 
    AND (p_organization_id IS NULL OR organization_id = p_organization_id);
  
  -- Insert new aggregated data
  INSERT INTO public.driver_commissions_reports (
    driver_id, report_date, total_loads, total_commissions, total_amount, organization_id
  )
  SELECT 
    l.driver_id,
    p_report_date,
    COUNT(*)::INTEGER as total_loads,
    COALESCE(SUM(l.commission_amount), 0) as total_commissions,
    COALESCE(SUM(l.total_amount), 0) as total_amount,
    l.organization_id
  FROM public.loads l
  WHERE l.date = p_report_date
    AND (p_organization_id IS NULL OR l.organization_id = p_organization_id)
    AND l.driver_id IS NOT NULL
  GROUP BY l.driver_id, l.organization_id;
END;
$$;