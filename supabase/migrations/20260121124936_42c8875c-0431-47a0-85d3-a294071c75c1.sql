
-- تحديث سياسات RLS لجدول chart_of_accounts للسماح بعرض البيانات بدون منظمة

-- حذف السياسات القديمة
DROP POLICY IF EXISTS "Users can view accounts" ON public.chart_of_accounts;
DROP POLICY IF EXISTS "Users can manage accounts" ON public.chart_of_accounts;

-- إنشاء سياسة جديدة للعرض (تشمل البيانات بدون منظمة)
CREATE POLICY "Users can view accounts" 
ON public.chart_of_accounts 
FOR SELECT 
USING (
  organization_id IS NULL 
  OR organization_id = get_user_organization(auth.uid()) 
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- إنشاء سياسة جديدة للإدارة
CREATE POLICY "Users can manage accounts" 
ON public.chart_of_accounts 
FOR ALL 
USING (
  organization_id IS NULL 
  OR organization_id = get_user_organization(auth.uid()) 
  OR has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  organization_id IS NULL 
  OR organization_id = get_user_organization(auth.uid()) 
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- تحديث سياسات custody_expenses
DROP POLICY IF EXISTS "Admins and managers can manage expenses" ON public.custody_expenses;
DROP POLICY IF EXISTS "Authenticated users can view expenses" ON public.custody_expenses;

CREATE POLICY "Users can view custody expenses" 
ON public.custody_expenses 
FOR SELECT 
USING (
  organization_id IS NULL 
  OR organization_id = get_user_organization(auth.uid()) 
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'manager'::app_role)
);

CREATE POLICY "Users can manage custody expenses" 
ON public.custody_expenses 
FOR ALL 
USING (
  organization_id IS NULL 
  OR organization_id = get_user_organization(auth.uid()) 
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'manager'::app_role)
)
WITH CHECK (
  organization_id IS NULL 
  OR organization_id = get_user_organization(auth.uid()) 
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'manager'::app_role)
);

-- تحديث سياسات journal_entry_lines
DROP POLICY IF EXISTS "Accountants and admins can manage journal lines" ON public.journal_entry_lines;
DROP POLICY IF EXISTS "Accounting users can view journal lines" ON public.journal_entry_lines;

CREATE POLICY "Users can view journal lines" 
ON public.journal_entry_lines 
FOR SELECT 
USING (true);

CREATE POLICY "Users can manage journal lines" 
ON public.journal_entry_lines 
FOR ALL 
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'accountant'::app_role)
  OR has_role(auth.uid(), 'manager'::app_role)
);

-- تحديث سياسات journal_entries
DROP POLICY IF EXISTS "Users can view journal entries" ON public.journal_entries;
DROP POLICY IF EXISTS "Users can manage journal entries" ON public.journal_entries;

CREATE POLICY "Users can view journal entries" 
ON public.journal_entries 
FOR SELECT 
USING (
  organization_id IS NULL 
  OR organization_id = get_user_organization(auth.uid()) 
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Users can manage journal entries" 
ON public.journal_entries 
FOR ALL 
USING (
  organization_id IS NULL 
  OR organization_id = get_user_organization(auth.uid()) 
  OR has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  organization_id IS NULL 
  OR organization_id = get_user_organization(auth.uid()) 
  OR has_role(auth.uid(), 'admin'::app_role)
);
