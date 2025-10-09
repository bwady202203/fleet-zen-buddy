-- Fix the SELECT policy to allow users to view organizations they just created
DROP POLICY IF EXISTS "Users can view their organizations" ON public.organizations;

-- Allow authenticated users to view all organizations (they can only modify their own)
CREATE POLICY "Users can view their organizations"
  ON public.organizations FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT organization_id 
      FROM public.user_organizations
      WHERE user_id = auth.uid()
    )
    OR 
    -- Allow viewing immediately after creation (before user_organizations link is created)
    created_at > (now() - interval '5 seconds')
  );