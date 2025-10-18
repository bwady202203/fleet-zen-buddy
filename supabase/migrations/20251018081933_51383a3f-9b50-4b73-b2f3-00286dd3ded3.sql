-- تحديث سياسات RLS لعزل البيانات بين الشركات المختلفة

-- إنشاء دالة للحصول على شركة المستخدم الحالية
CREATE OR REPLACE FUNCTION public.get_user_organization(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id
  FROM public.user_organizations
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- تحديث سياسات الشركات (companies)
DROP POLICY IF EXISTS "Authenticated users can view companies" ON public.companies;
CREATE POLICY "Users can view their organization companies"
ON public.companies FOR SELECT
TO authenticated
USING (organization_id = public.get_user_organization(auth.uid()) OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins and managers can manage companies" ON public.companies;
CREATE POLICY "Users can manage their organization companies"
ON public.companies FOR ALL
TO authenticated
USING (organization_id = public.get_user_organization(auth.uid()))
WITH CHECK (organization_id = public.get_user_organization(auth.uid()));

-- تحديث سياسات الموظفين (employees)
DROP POLICY IF EXISTS "Admins and managers can view employees" ON public.employees;
DROP POLICY IF EXISTS "Admins and managers can manage employees" ON public.employees;

CREATE POLICY "Users can view their organization employees"
ON public.employees FOR SELECT
TO authenticated
USING (organization_id = public.get_user_organization(auth.uid()));

CREATE POLICY "Users can manage their organization employees"
ON public.employees FOR ALL
TO authenticated
USING (organization_id = public.get_user_organization(auth.uid()))
WITH CHECK (organization_id = public.get_user_organization(auth.uid()));

-- تحديث سياسات الشحنات (loads)
DROP POLICY IF EXISTS "Authenticated users can view loads" ON public.loads;
DROP POLICY IF EXISTS "Authenticated users can create loads" ON public.loads;
DROP POLICY IF EXISTS "Admins and managers can manage loads" ON public.loads;

CREATE POLICY "Users can view their organization loads"
ON public.loads FOR SELECT
TO authenticated
USING (organization_id = public.get_user_organization(auth.uid()));

CREATE POLICY "Users can manage their organization loads"
ON public.loads FOR ALL
TO authenticated
USING (organization_id = public.get_user_organization(auth.uid()))
WITH CHECK (organization_id = public.get_user_organization(auth.uid()));

-- تحديث سياسات السائقين (drivers)
DROP POLICY IF EXISTS "Authenticated users can view drivers" ON public.drivers;
DROP POLICY IF EXISTS "Admins and managers can manage drivers" ON public.drivers;

CREATE POLICY "Users can view their organization drivers"
ON public.drivers FOR SELECT
TO authenticated
USING (organization_id = public.get_user_organization(auth.uid()));

CREATE POLICY "Users can manage their organization drivers"
ON public.drivers FOR ALL
TO authenticated
USING (organization_id = public.get_user_organization(auth.uid()))
WITH CHECK (organization_id = public.get_user_organization(auth.uid()));

-- تحديث سياسات المركبات (vehicles)
DROP POLICY IF EXISTS "Authenticated users can view vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Admins can manage vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Authenticated users can create vehicles" ON public.vehicles;

CREATE POLICY "Users can view their organization vehicles"
ON public.vehicles FOR SELECT
TO authenticated
USING (organization_id = public.get_user_organization(auth.uid()));

CREATE POLICY "Users can manage their organization vehicles"
ON public.vehicles FOR ALL
TO authenticated
USING (organization_id = public.get_user_organization(auth.uid()))
WITH CHECK (organization_id = public.get_user_organization(auth.uid()));

-- تحديث سياسات قطع الغيار (spare_parts)
DROP POLICY IF EXISTS "Authenticated users can view spare parts" ON public.spare_parts;
DROP POLICY IF EXISTS "Admins and managers can manage spare parts" ON public.spare_parts;

CREATE POLICY "Users can view their organization spare parts"
ON public.spare_parts FOR SELECT
TO authenticated
USING (organization_id = public.get_user_organization(auth.uid()));

CREATE POLICY "Users can manage their organization spare parts"
ON public.spare_parts FOR ALL
TO authenticated
USING (organization_id = public.get_user_organization(auth.uid()))
WITH CHECK (organization_id = public.get_user_organization(auth.uid()));

-- تحديث سياسات المحاسبة (chart_of_accounts)
DROP POLICY IF EXISTS "Accounting users can view accounts" ON public.chart_of_accounts;
DROP POLICY IF EXISTS "Accountants and admins can manage accounts" ON public.chart_of_accounts;

CREATE POLICY "Users can view their organization accounts"
ON public.chart_of_accounts FOR SELECT
TO authenticated
USING (organization_id = public.get_user_organization(auth.uid()));

CREATE POLICY "Users can manage their organization accounts"
ON public.chart_of_accounts FOR ALL
TO authenticated
USING (organization_id = public.get_user_organization(auth.uid()))
WITH CHECK (organization_id = public.get_user_organization(auth.uid()));

-- تحديث سياسات القيود اليومية (journal_entries)
DROP POLICY IF EXISTS "Accounting users can view journal entries" ON public.journal_entries;
DROP POLICY IF EXISTS "Accountants and admins can manage journal entries" ON public.journal_entries;

CREATE POLICY "Users can view their organization journal entries"
ON public.journal_entries FOR SELECT
TO authenticated
USING (organization_id = public.get_user_organization(auth.uid()));

CREATE POLICY "Users can manage their organization journal entries"
ON public.journal_entries FOR ALL
TO authenticated
USING (organization_id = public.get_user_organization(auth.uid()))
WITH CHECK (organization_id = public.get_user_organization(auth.uid()));