-- Fix infinite recursion in RLS policies for user_organizations

-- First, drop all existing policies on user_organizations that cause recursion
DROP POLICY IF EXISTS "Users and admins can view organization memberships" ON public.user_organizations;
DROP POLICY IF EXISTS "Admins can manage organization memberships" ON public.user_organizations;
DROP POLICY IF EXISTS "Users can view their organization memberships" ON public.user_organizations;
DROP POLICY IF EXISTS "Users can create organization memberships" ON public.user_organizations;

-- Create a SECURITY DEFINER function to check organization membership without RLS
CREATE OR REPLACE FUNCTION public.get_user_organizations(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id FROM public.user_organizations WHERE user_id = _user_id
$$;

-- Create a SECURITY DEFINER function to check if user is admin in any of their organizations
CREATE OR REPLACE FUNCTION public.is_org_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = _user_id AND role = 'admin'::app_role
  )
$$;

-- Create simple non-recursive policies for user_organizations
-- Policy 1: Users can view their own memberships
CREATE POLICY "Users can view own memberships"
ON public.user_organizations
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Policy 2: Admins can view all memberships in their organizations
CREATE POLICY "Admins can view org memberships"
ON public.user_organizations
FOR SELECT
TO authenticated
USING (
  public.is_org_admin(auth.uid()) 
  AND organization_id IN (SELECT public.get_user_organizations(auth.uid()))
);

-- Policy 3: Admins can insert memberships
CREATE POLICY "Admins can insert memberships"
ON public.user_organizations
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_org_admin(auth.uid()) 
  AND organization_id IN (SELECT public.get_user_organizations(auth.uid()))
);

-- Policy 4: Admins can update memberships
CREATE POLICY "Admins can update memberships"
ON public.user_organizations
FOR UPDATE
TO authenticated
USING (
  public.is_org_admin(auth.uid()) 
  AND organization_id IN (SELECT public.get_user_organizations(auth.uid()))
)
WITH CHECK (
  public.is_org_admin(auth.uid()) 
  AND organization_id IN (SELECT public.get_user_organizations(auth.uid()))
);

-- Policy 5: Admins can delete memberships
CREATE POLICY "Admins can delete memberships"
ON public.user_organizations
FOR DELETE
TO authenticated
USING (
  public.is_org_admin(auth.uid()) 
  AND organization_id IN (SELECT public.get_user_organizations(auth.uid()))
);

-- Also fix user_roles policies to prevent recursion
DROP POLICY IF EXISTS "Users can view roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;

-- Simple policy: users can view their own roles
CREATE POLICY "Users view own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Admins can view all roles in their organizations
CREATE POLICY "Admins view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (
  public.is_org_admin(auth.uid())
  AND (
    organization_id IN (SELECT public.get_user_organizations(auth.uid()))
    OR organization_id IS NULL
  )
);

-- Admins can manage roles
DROP POLICY IF EXISTS "Admins can manage user roles" ON public.user_roles;

CREATE POLICY "Admins insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.is_org_admin(auth.uid()));

CREATE POLICY "Admins update roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (public.is_org_admin(auth.uid()))
WITH CHECK (public.is_org_admin(auth.uid()));

CREATE POLICY "Admins delete roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (public.is_org_admin(auth.uid()));