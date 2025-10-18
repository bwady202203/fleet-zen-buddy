-- إزالة جميع السياسات الحالية على user_roles
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Service role can manage all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Org admins can manage org roles" ON public.user_roles;

-- إنشاء سياسات بسيطة بدون استخدام has_role
-- السماح للمستخدمين بمشاهدة أدوارهم الخاصة
CREATE POLICY "Users can view own roles" 
ON public.user_roles 
FOR SELECT 
TO authenticated
USING (user_id = auth.uid());

-- السماح للجميع بإدراج أدوار جديدة (سيتم التحكم من خلال التطبيق)
CREATE POLICY "Allow role insertion" 
ON public.user_roles 
FOR INSERT 
TO authenticated
WITH CHECK (true);

-- السماح بالتحديث والحذف بناءً على user_id
CREATE POLICY "Users can manage own roles" 
ON public.user_roles 
FOR ALL
TO authenticated
USING (user_id = auth.uid());

-- إنشاء دالة security definer بسيطة للتحقق من الدور
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role::text
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;