-- Create function to verify delivery system user
CREATE OR REPLACE FUNCTION public.verify_delivery_system_user(p_username TEXT, p_password TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_password_hash TEXT;
BEGIN
  SELECT password_hash INTO v_password_hash
  FROM public.delivery_system_users
  WHERE username = p_username AND is_active = true;
  
  IF v_password_hash IS NULL THEN
    RETURN FALSE;
  END IF;
  
  RETURN (v_password_hash = crypt(p_password, v_password_hash));
END;
$$;