-- Drop the old restrictive policy
DROP POLICY IF EXISTS "Users can delete draft transfer requests" ON public.transfer_requests;

-- Create new policy allowing deletion of all transfer requests
CREATE POLICY "Users can delete transfer requests"
ON public.transfer_requests
FOR DELETE
USING (true);