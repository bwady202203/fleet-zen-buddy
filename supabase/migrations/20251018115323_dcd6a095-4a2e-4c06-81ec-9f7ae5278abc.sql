-- Add policy to allow viewing vehicles with NULL organization_id
CREATE POLICY "Users can view vehicles with null organization"
ON public.vehicles
FOR SELECT
TO authenticated
USING (organization_id IS NULL);

-- Add policy to allow admins to manage vehicles with NULL organization_id
CREATE POLICY "Admins can manage vehicles with null organization"
ON public.vehicles
FOR ALL
TO authenticated
USING (organization_id IS NULL AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role)))
WITH CHECK (organization_id IS NULL AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role)));