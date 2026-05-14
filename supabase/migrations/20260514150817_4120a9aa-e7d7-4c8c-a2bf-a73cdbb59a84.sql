
-- Drop public-role permissive SELECT policies that expose data to anonymous users
DROP POLICY IF EXISTS "Anyone can view company settings" ON public.company_settings;
DROP POLICY IF EXISTS "Authenticated users can view representatives" ON public.custody_representatives;
DROP POLICY IF EXISTS "Authenticated users can view transfers" ON public.custody_transfers;
DROP POLICY IF EXISTS "Authenticated users can view driver payments" ON public.driver_payments;
DROP POLICY IF EXISTS "Users can view journal lines" ON public.journal_entry_lines;
DROP POLICY IF EXISTS "Allow all to view loads" ON public.loads;
DROP POLICY IF EXISTS "Authenticated users can view suppliers" ON public.suppliers;

-- watched_accounts: drop public-role policies; authenticated ALL policy already exists
DROP POLICY IF EXISTS "Users can view watched accounts" ON public.watched_accounts;
DROP POLICY IF EXISTS "Users can insert watched accounts" ON public.watched_accounts;
DROP POLICY IF EXISTS "Users can delete watched accounts" ON public.watched_accounts;

-- Prevent self-registration role escalation: only admins can assign roles
DROP POLICY IF EXISTS "Self registration with employee role only" ON public.user_roles;

-- zatca_certificates: prevent accountants from reading sensitive private keys.
-- Split the ALL policy into per-command policies that exclude SELECT for accountants.
DROP POLICY IF EXISTS "Admins/accountants manage zatca certificates" ON public.zatca_certificates;

CREATE POLICY "Admins and accountants insert zatca_certificates"
  ON public.zatca_certificates FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'accountant'::app_role));

CREATE POLICY "Admins and accountants update zatca_certificates"
  ON public.zatca_certificates FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'accountant'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'accountant'::app_role));

CREATE POLICY "Admins and accountants delete zatca_certificates"
  ON public.zatca_certificates FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'accountant'::app_role));
-- SELECT remains restricted to admins via existing "Only admins can view zatca_certificates"
