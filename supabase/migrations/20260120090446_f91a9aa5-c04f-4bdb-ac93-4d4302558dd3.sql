-- Fix security vulnerability in user_roles table
-- Remove the overly permissive INSERT policy that allows privilege escalation

-- Drop the problematic policies
DROP POLICY IF EXISTS "Allow role insertion" ON public.user_roles;
DROP POLICY IF EXISTS "Users can manage own roles" ON public.user_roles;

-- Create secure INSERT policy - only admins can insert roles
CREATE POLICY "Only admins can insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  -- Check if the inserting user is an admin
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role = 'admin'::app_role
  )
  OR
  -- Or if this is the first user (no admins exist yet) - allow admin role creation
  (
    NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin'::app_role)
    AND role = 'admin'::app_role
  )
);

-- Create policy for new user self-registration - only allow 'employee' role
CREATE POLICY "Self registration with employee role only"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  -- User can only insert for themselves with 'employee' role
  user_id = auth.uid() 
  AND role = 'employee'::app_role
  -- Only if they don't already have a role
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = auth.uid()
  )
);