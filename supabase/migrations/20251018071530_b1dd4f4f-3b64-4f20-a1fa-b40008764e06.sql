-- إضافة organization_id لجدول user_roles
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

-- تحديث دالة has_role للتحقق من الدور ضمن الشركة الحالية
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _org_id UUID;
BEGIN
  -- الحصول على الشركة الحالية للمستخدم
  SELECT organization_id INTO _org_id
  FROM public.user_organizations
  WHERE user_id = _user_id
  LIMIT 1;
  
  -- التحقق من وجود الدور للمستخدم في الشركة الحالية
  -- أو دور عام (بدون تحديد شركة) للمستخدم الرئيسي
  RETURN EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
      AND (organization_id = _org_id OR organization_id IS NULL)
  );
END;
$$;

-- تحديث سياسات RLS لجدول user_roles
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;

CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Global admins can manage all roles"
ON public.user_roles FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'admin'
      AND ur.organization_id IS NULL
  )
);

CREATE POLICY "Organization admins can manage roles in their organization"
ON public.user_roles FOR ALL
USING (
  organization_id IN (
    SELECT uo.organization_id
    FROM public.user_organizations uo
    JOIN public.user_roles ur ON ur.user_id = uo.user_id AND ur.organization_id = uo.organization_id
    WHERE uo.user_id = auth.uid()
      AND ur.role = 'admin'
  )
);