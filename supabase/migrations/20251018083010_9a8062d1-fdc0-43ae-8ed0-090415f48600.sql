-- تحديث سياسات RLS لشجرة الحسابات للسماح بعرض البيانات القديمة
DROP POLICY IF EXISTS "Users can view their organization accounts" ON public.chart_of_accounts;
DROP POLICY IF EXISTS "Users can manage their organization accounts" ON public.chart_of_accounts;

CREATE POLICY "Users can view accounts"
ON public.chart_of_accounts
FOR SELECT
USING (
  organization_id IS NULL OR 
  organization_id = get_user_organization(auth.uid())
);

CREATE POLICY "Users can manage accounts"
ON public.chart_of_accounts
FOR ALL
USING (
  organization_id IS NULL OR 
  organization_id = get_user_organization(auth.uid())
)
WITH CHECK (
  organization_id IS NULL OR 
  organization_id = get_user_organization(auth.uid())
);

-- تحديث سياسات RLS لقيود اليومية للسماح بعرض البيانات القديمة
DROP POLICY IF EXISTS "Users can view their organization journal entries" ON public.journal_entries;
DROP POLICY IF EXISTS "Users can manage their organization journal entries" ON public.journal_entries;

CREATE POLICY "Users can view journal entries"
ON public.journal_entries
FOR SELECT
USING (
  organization_id IS NULL OR 
  organization_id = get_user_organization(auth.uid())
);

CREATE POLICY "Users can manage journal entries"
ON public.journal_entries
FOR ALL
USING (
  organization_id IS NULL OR 
  organization_id = get_user_organization(auth.uid())
)
WITH CHECK (
  organization_id IS NULL OR 
  organization_id = get_user_organization(auth.uid())
);