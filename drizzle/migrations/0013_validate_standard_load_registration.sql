CREATE OR REPLACE FUNCTION public.register_standard_load(p_load jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE new_id uuid; field_name text;
BEGIN
  FOREACH field_name IN ARRAY ARRAY['unit_price','driver_commission','delivery_commission','total_amount','commission_amount'] LOOP
    IF p_load->>field_name IS NULL OR (p_load->>field_name) !~ '^[0-9]+([.][0-9]+)?$' OR length(p_load->>field_name) > 40 THEN
      RAISE EXCEPTION 'يرجى إدخال قيمة رقمية صحيحة: %', field_name USING ERRCODE = '22023';
    END IF;
  END LOOP;
  new_id := public.register_premium_load(p_load);
  UPDATE public.loads SET unit_price = (p_load->>'unit_price')::numeric, total_amount = (p_load->>'total_amount')::numeric, commission_amount = (p_load->>'commission_amount')::numeric, delivery_commission = (p_load->>'delivery_commission')::numeric, notes = NULLIF(p_load->>'notes', '') WHERE id = new_id;
  RETURN new_id;
END;
$$;
REVOKE ALL ON FUNCTION public.register_standard_load(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.register_standard_load(jsonb) TO authenticated, service_role;