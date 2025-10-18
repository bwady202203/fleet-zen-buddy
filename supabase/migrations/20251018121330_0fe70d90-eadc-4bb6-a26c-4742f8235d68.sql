-- دالة لنسخ شجرة الحسابات الأساسية لشركة جديدة
CREATE OR REPLACE FUNCTION public.initialize_organization_chart_of_accounts(p_organization_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_account RECORD;
  v_old_to_new_id_map JSONB := '{}';
  v_new_id UUID;
BEGIN
  -- نسخ الحسابات الرئيسية (التي ليس لها parent)
  FOR v_account IN 
    SELECT * FROM chart_of_accounts 
    WHERE organization_id IS NULL AND parent_id IS NULL
    ORDER BY code
  LOOP
    v_new_id := gen_random_uuid();
    
    INSERT INTO chart_of_accounts (
      id, code, name_ar, name_en, type, balance, 
      parent_id, organization_id, is_active
    ) VALUES (
      v_new_id, v_account.code, v_account.name_ar, v_account.name_en,
      v_account.type, 0, NULL, p_organization_id, v_account.is_active
    );
    
    -- حفظ الربط بين المعرف القديم والجديد
    v_old_to_new_id_map := jsonb_set(
      v_old_to_new_id_map, 
      ARRAY[v_account.id::text], 
      to_jsonb(v_new_id)
    );
  END LOOP;
  
  -- نسخ الحسابات الفرعية (التي لها parent)
  FOR v_account IN 
    SELECT * FROM chart_of_accounts 
    WHERE organization_id IS NULL AND parent_id IS NOT NULL
    ORDER BY code
  LOOP
    v_new_id := gen_random_uuid();
    
    INSERT INTO chart_of_accounts (
      id, code, name_ar, name_en, type, balance,
      parent_id, organization_id, is_active
    ) VALUES (
      v_new_id, v_account.code, v_account.name_ar, v_account.name_en,
      v_account.type, 0,
      -- استخدام المعرف الجديد للحساب الأب
      (v_old_to_new_id_map->>v_account.parent_id::text)::UUID,
      p_organization_id, v_account.is_active
    );
    
    v_old_to_new_id_map := jsonb_set(
      v_old_to_new_id_map, 
      ARRAY[v_account.id::text], 
      to_jsonb(v_new_id)
    );
  END LOOP;
  
END;
$$;

-- Trigger لتهيئة شجرة الحسابات تلقائياً عند إنشاء شركة جديدة
CREATE OR REPLACE FUNCTION public.auto_initialize_organization()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- تهيئة شجرة الحسابات للشركة الجديدة
  IF NEW.database_initialized = false THEN
    PERFORM initialize_organization_chart_of_accounts(NEW.id);
    
    -- تحديث حالة التهيئة
    UPDATE organizations 
    SET database_initialized = true 
    WHERE id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- إنشاء Trigger على جدول الشركات
DROP TRIGGER IF EXISTS trigger_initialize_organization ON organizations;
CREATE TRIGGER trigger_initialize_organization
  AFTER INSERT ON organizations
  FOR EACH ROW
  WHEN (NEW.database_initialized = false)
  EXECUTE FUNCTION auto_initialize_organization();

-- تحديث RLS policies لجدول chart_of_accounts لضمان العزل الكامل
DROP POLICY IF EXISTS "Users can manage accounts" ON chart_of_accounts;
CREATE POLICY "Users can manage accounts" ON chart_of_accounts
  FOR ALL
  USING (
    organization_id = get_user_organization(auth.uid()) OR
    has_role(auth.uid(), 'admin'::app_role)
  )
  WITH CHECK (
    organization_id = get_user_organization(auth.uid()) OR
    has_role(auth.uid(), 'admin'::app_role)
  );

DROP POLICY IF EXISTS "Users can view accounts" ON chart_of_accounts;
CREATE POLICY "Users can view accounts" ON chart_of_accounts
  FOR SELECT
  USING (
    organization_id = get_user_organization(auth.uid()) OR
    has_role(auth.uid(), 'admin'::app_role)
  );

-- تحديث RLS policies لجدول journal_entries
DROP POLICY IF EXISTS "Users can manage journal entries" ON journal_entries;
CREATE POLICY "Users can manage journal entries" ON journal_entries
  FOR ALL
  USING (
    organization_id = get_user_organization(auth.uid()) OR
    has_role(auth.uid(), 'admin'::app_role)
  )
  WITH CHECK (
    organization_id = get_user_organization(auth.uid()) OR
    has_role(auth.uid(), 'admin'::app_role)
  );

DROP POLICY IF EXISTS "Users can view journal entries" ON journal_entries;
CREATE POLICY "Users can view journal entries" ON journal_entries
  FOR SELECT
  USING (
    organization_id = get_user_organization(auth.uid()) OR
    has_role(auth.uid(), 'admin'::app_role)
  );