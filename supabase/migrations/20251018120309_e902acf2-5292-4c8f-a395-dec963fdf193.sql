-- إضافة سياسة للسماح للمسؤولين بتعديل أدوار المستخدمين في شركاتهم
CREATE POLICY "Admins can update user roles in their organizations"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (
  organization_id IN (
    SELECT uo.organization_id 
    FROM public.user_organizations uo
    JOIN public.user_roles ur ON ur.user_id = uo.user_id AND ur.organization_id = uo.organization_id
    WHERE uo.user_id = auth.uid() 
    AND ur.role = 'admin'
  )
)
WITH CHECK (
  organization_id IN (
    SELECT uo.organization_id 
    FROM public.user_organizations uo
    JOIN public.user_roles ur ON ur.user_id = uo.user_id AND ur.organization_id = uo.organization_id
    WHERE uo.user_id = auth.uid() 
    AND ur.role = 'admin'
  )
);

-- إضافة سياسة للسماح للمسؤولين بحذف أدوار المستخدمين في شركاتهم
CREATE POLICY "Admins can delete user roles in their organizations"
ON public.user_roles
FOR DELETE
TO authenticated
USING (
  organization_id IN (
    SELECT uo.organization_id 
    FROM public.user_organizations uo
    JOIN public.user_roles ur ON ur.user_id = uo.user_id AND ur.organization_id = uo.organization_id
    WHERE uo.user_id = auth.uid() 
    AND ur.role = 'admin'
  )
);