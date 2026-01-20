-- Fix RLS policies to allow admins to manage users in their organizations

-- 1. Fix user_organizations policies
DROP POLICY IF EXISTS "Users can view their organization memberships" ON public.user_organizations;

CREATE POLICY "Users and admins can view organization memberships"
ON public.user_organizations
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() 
  OR 
  -- Admins can see all users in their organizations
  organization_id IN (
    SELECT uo.organization_id 
    FROM public.user_organizations uo
    JOIN public.user_roles ur ON ur.user_id = uo.user_id AND (ur.organization_id = uo.organization_id OR ur.organization_id IS NULL)
    WHERE uo.user_id = auth.uid() AND ur.role = 'admin'::app_role
  )
);

-- Allow admins to add users to their organizations
DROP POLICY IF EXISTS "Users can create organization memberships" ON public.user_organizations;

CREATE POLICY "Admins can manage organization memberships"
ON public.user_organizations
FOR ALL
TO authenticated
USING (
  organization_id IN (
    SELECT uo.organization_id 
    FROM public.user_organizations uo
    JOIN public.user_roles ur ON ur.user_id = uo.user_id AND (ur.organization_id = uo.organization_id OR ur.organization_id IS NULL)
    WHERE uo.user_id = auth.uid() AND ur.role = 'admin'::app_role
  )
)
WITH CHECK (
  organization_id IN (
    SELECT uo.organization_id 
    FROM public.user_organizations uo
    JOIN public.user_roles ur ON ur.user_id = uo.user_id AND (ur.organization_id = uo.organization_id OR ur.organization_id IS NULL)
    WHERE uo.user_id = auth.uid() AND ur.role = 'admin'::app_role
  )
);

-- 2. Fix user_roles SELECT policy - allow admins to see roles in their organizations
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;

CREATE POLICY "Users can view roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR
  -- Admins can see all roles in their organizations
  has_role(auth.uid(), 'admin'::app_role)
);