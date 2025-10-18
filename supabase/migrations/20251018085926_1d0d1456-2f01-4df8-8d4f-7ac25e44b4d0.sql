-- تحديث سياسات RLS لجدول spare_parts_purchases
DROP POLICY IF EXISTS "Users can manage their organization purchases" ON public.spare_parts_purchases;
DROP POLICY IF EXISTS "Users can view their organization purchases" ON public.spare_parts_purchases;

CREATE POLICY "Users can manage purchases"
ON public.spare_parts_purchases
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

CREATE POLICY "Users can view purchases"
ON public.spare_parts_purchases
FOR SELECT
USING (
  organization_id IS NULL OR 
  organization_id = get_user_organization(auth.uid())
);