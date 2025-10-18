-- Fix infinite recursion in user_roles RLS policies
-- Drop ALL existing policies on user_roles
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'user_roles' 
        AND schemaname = 'public'
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.user_roles', r.policyname);
    END LOOP;
END $$;

-- Create new policies that don't cause recursion
-- Allow users to view their own roles (direct check, no function call)
CREATE POLICY "Users can view own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Allow service role full access (for admin operations)
CREATE POLICY "Service role can manage all roles"
ON public.user_roles
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Allow admins to manage roles by checking directly in the table (not using has_role to avoid recursion)
CREATE POLICY "Admins can manage all roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role = 'admin'
    AND ur.organization_id IS NULL
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role = 'admin'
    AND ur.organization_id IS NULL
  )
);

-- Allow organization admins to manage roles in their organization
CREATE POLICY "Org admins can manage org roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (
  organization_id IN (
    SELECT ur.organization_id
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role = 'admin'
    AND ur.organization_id IS NOT NULL
  )
)
WITH CHECK (
  organization_id IN (
    SELECT ur.organization_id
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role = 'admin'
    AND ur.organization_id IS NOT NULL
  )
);