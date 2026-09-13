CREATE OR REPLACE FUNCTION public.set_account_level()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE lvl INTEGER := 1; cur UUID;
BEGIN
  cur := NEW.parent_id;
  WHILE cur IS NOT NULL LOOP
    lvl := lvl + 1;
    SELECT parent_id INTO cur FROM public.chart_of_accounts WHERE id = cur;
    IF lvl > 10 THEN EXIT; END IF;
  END LOOP;
  NEW.level := lvl;
  RETURN NEW;
END;
$function$;