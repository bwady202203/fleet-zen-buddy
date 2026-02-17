
-- Update create_journal_entry_with_number to also set universal_serial with 'JE' prefix
CREATE OR REPLACE FUNCTION public.create_journal_entry_with_number(p_date DATE, p_description TEXT)
RETURNS TABLE(id UUID, entry_number TEXT, date DATE, description TEXT, created_at TIMESTAMPTZ)
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_entry_number TEXT;
  v_next_number INTEGER;
  v_current_year INTEGER;
  v_max_number TEXT;
  v_entry_id UUID;
  v_created_at TIMESTAMPTZ;
  v_numeric_part TEXT;
  v_universal_serial TEXT;
BEGIN
  v_current_year := EXTRACT(YEAR FROM CURRENT_DATE);
  
  SELECT je.entry_number
  INTO v_max_number
  FROM public.journal_entries je
  WHERE je.entry_number LIKE 'JE-' || v_current_year::TEXT || '%'
  ORDER BY je.entry_number DESC
  LIMIT 1;
  
  IF v_max_number IS NULL THEN
    v_next_number := 1;
  ELSE
    v_numeric_part := SUBSTRING(v_max_number FROM LENGTH(v_max_number) - 5);
    v_next_number := v_numeric_part::INTEGER + 1;
  END IF;
  
  v_entry_number := 'JE-' || v_current_year::TEXT || LPAD(v_next_number::TEXT, 6, '0');
  
  -- Generate universal serial
  v_universal_serial := public.generate_universal_serial('JE');
  
  INSERT INTO public.journal_entries (entry_number, date, description, universal_serial)
  VALUES (v_entry_number, p_date, p_description, v_universal_serial)
  RETURNING journal_entries.id, journal_entries.entry_number, journal_entries.date, 
            journal_entries.description, journal_entries.created_at
  INTO v_entry_id, v_entry_number, p_date, p_description, v_created_at;
  
  RETURN QUERY SELECT v_entry_id, v_entry_number, p_date, p_description, v_created_at;
END;
$$;
