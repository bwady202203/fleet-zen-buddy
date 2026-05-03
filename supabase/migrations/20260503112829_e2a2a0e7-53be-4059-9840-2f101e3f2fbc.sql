
DROP POLICY IF EXISTS "Authenticated users can view delivery system users" ON public.delivery_system_users;
DROP POLICY IF EXISTS "Admins can manage delivery system users" ON public.delivery_system_users;

CREATE POLICY "Admins can manage delivery system users"
ON public.delivery_system_users
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DELETE FROM public.delivery_system_users WHERE username = 'remal2233';

CREATE OR REPLACE FUNCTION public.update_company_quantity_on_load()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$ BEGIN
  UPDATE public.companies SET total_quantity = COALESCE(total_quantity,0) + NEW.quantity WHERE id = NEW.company_id;
  RETURN NEW; END; $$;

CREATE OR REPLACE FUNCTION public.update_company_quantity_on_load_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$ BEGIN
  UPDATE public.companies SET total_quantity = COALESCE(total_quantity,0) - OLD.quantity WHERE id = OLD.company_id;
  UPDATE public.companies SET total_quantity = COALESCE(total_quantity,0) + NEW.quantity WHERE id = NEW.company_id;
  RETURN NEW; END; $$;

CREATE OR REPLACE FUNCTION public.update_company_quantity_on_load_delete()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$ BEGIN
  UPDATE public.companies SET total_quantity = COALESCE(total_quantity,0) - OLD.quantity WHERE id = OLD.company_id;
  RETURN OLD; END; $$;

CREATE OR REPLACE FUNCTION public.calculate_account_level(account_id uuid)
RETURNS integer LANGUAGE plpgsql SET search_path = public
AS $$ DECLARE level_count INTEGER := 1; current_parent_id UUID;
BEGIN
  SELECT parent_id INTO current_parent_id FROM public.chart_of_accounts WHERE id = account_id;
  WHILE current_parent_id IS NOT NULL LOOP
    level_count := level_count + 1;
    SELECT parent_id INTO current_parent_id FROM public.chart_of_accounts WHERE id = current_parent_id;
  END LOOP;
  RETURN level_count;
END; $$;

CREATE OR REPLACE FUNCTION public.set_account_level()
RETURNS trigger LANGUAGE plpgsql SET search_path = public
AS $$ BEGIN NEW.level := public.calculate_account_level(NEW.id); RETURN NEW; END; $$;
