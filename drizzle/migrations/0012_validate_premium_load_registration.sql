CREATE OR REPLACE FUNCTION public.register_premium_load(p_load jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  field_name text;
  new_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'يجب تسجيل الدخول لحفظ الحمولة' USING ERRCODE = '42501';
  END IF;
  FOREACH field_name IN ARRAY ARRAY['load_number','invoice_date','company_id','load_type_id','driver_id','truck_number','quantity','unload_quantity','driver_commission','delivery_from','delivery_to'] LOOP
    IF NULLIF(btrim(p_load ->> field_name), '') IS NULL THEN
      RAISE EXCEPTION 'يرجى استكمال جميع الحقول المطلوبة: %', field_name USING ERRCODE = '22023';
    END IF;
  END LOOP;
  IF length(p_load->>'load_number') > 100 OR length(p_load->>'truck_number') > 100 OR length(p_load->>'delivery_from') > 200 OR length(p_load->>'delivery_to') > 200 THEN
    RAISE EXCEPTION 'قيمة أحد الحقول أطول من المسموح' USING ERRCODE = '22023';
  END IF;
  FOREACH field_name IN ARRAY ARRAY['quantity','unload_quantity','driver_commission'] LOOP
    IF (p_load ->> field_name) !~ '^[0-9]+([.][0-9]+)?$' OR length(p_load->>field_name) > 30 THEN
      RAISE EXCEPTION 'يرجى إدخال قيمة رقمية صحيحة: %', field_name USING ERRCODE = '22023';
    END IF;
  END LOOP;
  INSERT INTO public.loads (load_number, invoice_number, invoice_date, date, company_id, load_type_id, driver_id, truck_number, quantity, unload_quantity, driver_commission, delivery_from, delivery_to, load_date, unload_date, created_by)
  VALUES (btrim(p_load->>'load_number'), NULLIF(btrim(p_load->>'invoice_number'), ''), (p_load->>'invoice_date')::date, (p_load->>'date')::date, (p_load->>'company_id')::uuid, (p_load->>'load_type_id')::uuid, (p_load->>'driver_id')::uuid, btrim(p_load->>'truck_number'), (p_load->>'quantity')::numeric, (p_load->>'unload_quantity')::numeric, (p_load->>'driver_commission')::numeric, btrim(p_load->>'delivery_from'), btrim(p_load->>'delivery_to'), NULLIF(p_load->>'load_date', '')::date, NULLIF(p_load->>'unload_date', '')::date, auth.uid())
  RETURNING id INTO new_id;
  RETURN new_id;
END;
$$;
REVOKE ALL ON FUNCTION public.register_premium_load(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.register_premium_load(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.register_premium_load(jsonb) TO service_role;