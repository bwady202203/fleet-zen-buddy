-- إنشاء دالة لتوليد رقم قيد فريد والحفظ بشكل آمن
CREATE OR REPLACE FUNCTION public.create_journal_entry_with_number(
  p_date DATE,
  p_description TEXT
)
RETURNS TABLE (
  id UUID,
  entry_number TEXT,
  date DATE,
  description TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_entry_number TEXT;
  v_next_number INTEGER;
  v_current_year INTEGER;
  v_max_number TEXT;
  v_entry_id UUID;
  v_created_at TIMESTAMPTZ;
BEGIN
  -- الحصول على السنة الحالية
  v_current_year := EXTRACT(YEAR FROM CURRENT_DATE);
  
  -- البحث عن أعلى رقم قيد للسنة الحالية
  SELECT MAX(je.entry_number)
  INTO v_max_number
  FROM public.journal_entries je
  WHERE je.entry_number LIKE 'JE-' || v_current_year::TEXT || '%';
  
  -- حساب الرقم التالي
  IF v_max_number IS NULL THEN
    v_next_number := 1;
  ELSE
    -- استخراج الرقم التسلسلي من نهاية رقم القيد
    v_next_number := (SUBSTRING(v_max_number FROM 'JE-\d{4}(\d{6})$'))::INTEGER + 1;
  END IF;
  
  -- توليد رقم القيد الجديد
  v_entry_number := 'JE-' || v_current_year::TEXT || LPAD(v_next_number::TEXT, 6, '0');
  
  -- إدراج القيد الجديد
  INSERT INTO public.journal_entries (entry_number, date, description)
  VALUES (v_entry_number, p_date, p_description)
  RETURNING journal_entries.id, journal_entries.entry_number, journal_entries.date, 
            journal_entries.description, journal_entries.created_at
  INTO v_entry_id, v_entry_number, p_date, p_description, v_created_at;
  
  -- إرجاع البيانات
  RETURN QUERY SELECT v_entry_id, v_entry_number, p_date, p_description, v_created_at;
END;
$$;