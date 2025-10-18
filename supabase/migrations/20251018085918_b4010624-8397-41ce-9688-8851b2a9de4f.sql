-- تحديث سياسات RLS لجدول spare_parts للسماح برؤية البيانات القديمة
DROP POLICY IF EXISTS "Users can manage their organization spare parts" ON public.spare_parts;
DROP POLICY IF EXISTS "Users can view their organization spare parts" ON public.spare_parts;

CREATE POLICY "Users can manage their organization spare parts"
ON public.spare_parts
FOR ALL
USING (
  organization_id IS NULL OR 
  organization_id = get_user_organization(auth.uid())
)
WITH CHECK (
  organization_id IS NULL OR 
  organization_id = get_user_organization(auth.uid())
);

CREATE POLICY "Users can view their organization spare parts"
ON public.spare_parts
FOR SELECT
USING (
  organization_id IS NULL OR 
  organization_id = get_user_organization(auth.uid())
);

-- تحديث سياسات RLS لجدول stock_transactions
DROP POLICY IF EXISTS "Users can manage their organization stock transactions" ON public.stock_transactions;
DROP POLICY IF EXISTS "Users can view their organization stock transactions" ON public.stock_transactions;

CREATE POLICY "Users can manage stock transactions"
ON public.stock_transactions
FOR ALL
USING (
  organization_id IS NULL OR 
  organization_id = get_user_organization(auth.uid()) OR
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'manager'::app_role)
)
WITH CHECK (
  organization_id IS NULL OR 
  organization_id = get_user_organization(auth.uid())
);

CREATE POLICY "Users can view stock transactions"
ON public.stock_transactions
FOR SELECT
USING (
  organization_id IS NULL OR 
  organization_id = get_user_organization(auth.uid())
);