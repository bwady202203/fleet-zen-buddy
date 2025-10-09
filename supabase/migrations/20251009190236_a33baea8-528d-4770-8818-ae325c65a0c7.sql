-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can create organizations" ON public.organizations;
DROP POLICY IF EXISTS "Admins can manage their organizations" ON public.organizations;

-- Create new, more permissive policies for organizations
CREATE POLICY "Authenticated users can create organizations"
  ON public.organizations FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update their organizations"
  ON public.organizations FOR UPDATE
  TO authenticated
  USING (
    id IN (
      SELECT organization_id 
      FROM public.user_organizations
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their organizations"
  ON public.organizations FOR DELETE
  TO authenticated
  USING (
    id IN (
      SELECT uo.organization_id 
      FROM public.user_organizations uo
      JOIN public.user_roles ur ON ur.user_id = uo.user_id AND ur.organization_id = uo.organization_id
      WHERE uo.user_id = auth.uid() AND ur.role = 'admin'
    )
  );