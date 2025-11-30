-- حذف جميع السياسات القديمة المتضاربة على جدول loads
DROP POLICY IF EXISTS "Users can manage loads" ON public.loads;
DROP POLICY IF EXISTS "Users can view loads" ON public.loads;
DROP POLICY IF EXISTS "Users can view their organization loads" ON public.loads;
DROP POLICY IF EXISTS "Users can manage their organization loads" ON public.loads;

-- إنشاء سياسة واحدة للعرض: السماح للجميع بالوصول للبيانات
CREATE POLICY "Allow all to view loads"
ON public.loads
FOR SELECT
USING (true);

-- إنشاء سياسة واحدة للإدارة: السماح للمستخدمين المصادقين بإدارة البيانات
CREATE POLICY "Allow authenticated users to manage loads"
ON public.loads
FOR ALL
USING (
  auth.uid() IS NOT NULL
  AND (
    organization_id IS NULL 
    OR organization_id = get_user_organization(auth.uid())
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'manager'::app_role)
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL
  AND (
    organization_id IS NULL 
    OR organization_id = get_user_organization(auth.uid())
  )
);