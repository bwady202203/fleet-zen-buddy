-- تحديث سياسة RLS لجدول loads للسماح بعرض الشحنات التي organization_id لها NULL
DROP POLICY IF EXISTS "Users can view their organization loads" ON public.loads;
DROP POLICY IF EXISTS "Users can manage their organization loads" ON public.loads;

-- سياسة جديدة للعرض تسمح بالوصول للشحنات التي organization_id = NULL أو تطابق organization المستخدم
CREATE POLICY "Users can view their organization loads"
ON public.loads
FOR SELECT
USING (
  organization_id IS NULL 
  OR organization_id = get_user_organization(auth.uid())
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- سياسة جديدة للإدارة تسمح بالتعديل على الشحنات التي organization_id = NULL أو تطابق organization المستخدم
CREATE POLICY "Users can manage their organization loads"
ON public.loads
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
);