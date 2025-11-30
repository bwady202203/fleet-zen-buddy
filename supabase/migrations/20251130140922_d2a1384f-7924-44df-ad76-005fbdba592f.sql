-- Fix search_path for the newly created functions

DROP FUNCTION IF EXISTS generate_company_loads_report(DATE, UUID);
DROP FUNCTION IF EXISTS generate_driver_commissions_report(DATE, UUID);

-- Function to generate company loads report for a specific date
CREATE OR REPLACE FUNCTION generate_company_loads_report(p_report_date DATE, p_organization_id UUID DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
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
SET search_path = 'public'
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