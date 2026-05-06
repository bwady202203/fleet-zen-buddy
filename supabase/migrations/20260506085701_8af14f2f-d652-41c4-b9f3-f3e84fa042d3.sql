
-- Helper: check if user belongs to organization
CREATE OR REPLACE FUNCTION public.user_in_org(_user_id uuid, _org_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_organizations
    WHERE user_id = _user_id AND organization_id = _org_id
  )
$$;

-- ============ suppliers ============
DROP POLICY IF EXISTS "Public can view suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.suppliers;
DROP POLICY IF EXISTS "Anyone can view suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "suppliers_select_public" ON public.suppliers;
CREATE POLICY "Authenticated users can view suppliers in their org"
ON public.suppliers FOR SELECT TO authenticated
USING (organization_id IS NULL OR public.user_in_org(auth.uid(), organization_id));

-- ============ loads ============
DROP POLICY IF EXISTS "Public can view loads" ON public.loads;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.loads;
DROP POLICY IF EXISTS "Anyone can view loads" ON public.loads;
CREATE POLICY "Authenticated users can view loads in their org"
ON public.loads FOR SELECT TO authenticated
USING (organization_id IS NULL OR public.user_in_org(auth.uid(), organization_id));

-- ============ transfer_requests ============
DROP POLICY IF EXISTS "Public can view transfer_requests" ON public.transfer_requests;
DROP POLICY IF EXISTS "Public can insert transfer_requests" ON public.transfer_requests;
DROP POLICY IF EXISTS "Public can update transfer_requests" ON public.transfer_requests;
DROP POLICY IF EXISTS "Public can delete transfer_requests" ON public.transfer_requests;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.transfer_requests;
DROP POLICY IF EXISTS "Enable insert for all users" ON public.transfer_requests;
DROP POLICY IF EXISTS "Enable update for all users" ON public.transfer_requests;
DROP POLICY IF EXISTS "Enable delete for all users" ON public.transfer_requests;
CREATE POLICY "Authenticated can manage transfer_requests"
ON public.transfer_requests FOR ALL TO authenticated
USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public can view transfer_request_items" ON public.transfer_request_items;
DROP POLICY IF EXISTS "Public can insert transfer_request_items" ON public.transfer_request_items;
DROP POLICY IF EXISTS "Public can update transfer_request_items" ON public.transfer_request_items;
DROP POLICY IF EXISTS "Public can delete transfer_request_items" ON public.transfer_request_items;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.transfer_request_items;
DROP POLICY IF EXISTS "Enable insert for all users" ON public.transfer_request_items;
DROP POLICY IF EXISTS "Enable update for all users" ON public.transfer_request_items;
DROP POLICY IF EXISTS "Enable delete for all users" ON public.transfer_request_items;
CREATE POLICY "Authenticated can manage transfer_request_items"
ON public.transfer_request_items FOR ALL TO authenticated
USING (true) WITH CHECK (true);

-- ============ organizations: remove 5-second peek window ============
DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='organizations' AND cmd='SELECT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.organizations', pol.policyname);
  END LOOP;
END $$;
CREATE POLICY "Users can view their own organizations"
ON public.organizations FOR SELECT TO authenticated
USING (
  public.is_org_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.user_organizations uo
    WHERE uo.user_id = auth.uid() AND uo.organization_id = organizations.id
  )
);

-- ============ zatca_settings ============
DROP POLICY IF EXISTS "Authenticated can view zatca_settings" ON public.zatca_settings;
DROP POLICY IF EXISTS "Enable read access for authenticated" ON public.zatca_settings;
CREATE POLICY "Org members can view zatca_settings"
ON public.zatca_settings FOR SELECT TO authenticated
USING (organization_id IS NULL OR public.user_in_org(auth.uid(), organization_id));

-- ============ invoices ============
DROP POLICY IF EXISTS "Authenticated can view invoices" ON public.invoices;
DROP POLICY IF EXISTS "Enable read access for authenticated" ON public.invoices;
CREATE POLICY "Org members can view invoices"
ON public.invoices FOR SELECT TO authenticated
USING (organization_id IS NULL OR public.user_in_org(auth.uid(), organization_id));

-- ============ invoice_items ============
DROP POLICY IF EXISTS "Authenticated can view invoice_items" ON public.invoice_items;
DROP POLICY IF EXISTS "Enable read access for authenticated" ON public.invoice_items;
CREATE POLICY "Org members can view invoice_items"
ON public.invoice_items FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.invoices i
  WHERE i.id = invoice_items.invoice_id
    AND (i.organization_id IS NULL OR public.user_in_org(auth.uid(), i.organization_id))
));

-- ============ driver_payments ============
DROP POLICY IF EXISTS "Public can view driver_payments" ON public.driver_payments;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.driver_payments;
CREATE POLICY "Authenticated can view driver_payments"
ON public.driver_payments FOR SELECT TO authenticated
USING (organization_id IS NULL OR public.user_in_org(auth.uid(), organization_id));

-- ============ custody_transfers ============
DROP POLICY IF EXISTS "Public can view custody_transfers" ON public.custody_transfers;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.custody_transfers;
CREATE POLICY "Authenticated can view custody_transfers"
ON public.custody_transfers FOR SELECT TO authenticated
USING (organization_id IS NULL OR public.user_in_org(auth.uid(), organization_id));

-- ============ custody_representatives ============
DROP POLICY IF EXISTS "Public can view custody_representatives" ON public.custody_representatives;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.custody_representatives;
CREATE POLICY "Authenticated can view custody_representatives"
ON public.custody_representatives FOR SELECT TO authenticated
USING (organization_id IS NULL OR public.user_in_org(auth.uid(), organization_id));

-- ============ company_settings ============
DROP POLICY IF EXISTS "Public can view company_settings" ON public.company_settings;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.company_settings;
CREATE POLICY "Authenticated can view company_settings"
ON public.company_settings FOR SELECT TO authenticated
USING (true);

-- ============ cost_centers ============
DROP POLICY IF EXISTS "Authenticated can view cost_centers" ON public.cost_centers;
DROP POLICY IF EXISTS "Enable read access for authenticated" ON public.cost_centers;
CREATE POLICY "Org members can view cost_centers"
ON public.cost_centers FOR SELECT TO authenticated
USING (organization_id IS NULL OR public.user_in_org(auth.uid(), organization_id));

-- ============ branches ============
DROP POLICY IF EXISTS "Authenticated can view branches" ON public.branches;
DROP POLICY IF EXISTS "Enable read access for authenticated" ON public.branches;
CREATE POLICY "Authenticated can view branches"
ON public.branches FOR SELECT TO authenticated
USING (true);

-- ============ projects ============
DROP POLICY IF EXISTS "Authenticated can view projects" ON public.projects;
DROP POLICY IF EXISTS "Enable read access for authenticated" ON public.projects;
CREATE POLICY "Org members can view projects"
ON public.projects FOR SELECT TO authenticated
USING (organization_id IS NULL OR public.user_in_org(auth.uid(), organization_id));

-- ============ stock_transactions ============
DROP POLICY IF EXISTS "Authenticated can view stock_transactions" ON public.stock_transactions;
DROP POLICY IF EXISTS "Enable read access for authenticated" ON public.stock_transactions;
CREATE POLICY "Org members can view stock_transactions"
ON public.stock_transactions FOR SELECT TO authenticated
USING (organization_id IS NULL OR public.user_in_org(auth.uid(), organization_id));

-- ============ spare_parts_purchases ============
DROP POLICY IF EXISTS "Authenticated can view spare_parts_purchases" ON public.spare_parts_purchases;
DROP POLICY IF EXISTS "Enable read access for authenticated" ON public.spare_parts_purchases;
CREATE POLICY "Org members can view spare_parts_purchases"
ON public.spare_parts_purchases FOR SELECT TO authenticated
USING (organization_id IS NULL OR public.user_in_org(auth.uid(), organization_id));

-- ============ zatca_invoices / zatca_submissions ============
DROP POLICY IF EXISTS "Authenticated can view zatca_invoices" ON public.zatca_invoices;
CREATE POLICY "Org members can view zatca_invoices"
ON public.zatca_invoices FOR SELECT TO authenticated
USING (organization_id IS NULL OR public.user_in_org(auth.uid(), organization_id));

DROP POLICY IF EXISTS "Authenticated can view zatca_submissions" ON public.zatca_submissions;
CREATE POLICY "Org members can view zatca_submissions"
ON public.zatca_submissions FOR SELECT TO authenticated
USING (organization_id IS NULL OR public.user_in_org(auth.uid(), organization_id));

-- ============ vehicles: drop public policies ============
DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname='public' AND tablename='vehicles'
      AND 'public' = ANY(roles)
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.vehicles', pol.policyname);
  END LOOP;
END $$;
-- Ensure authenticated baseline policy exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='vehicles' AND cmd='SELECT') THEN
    EXECUTE 'CREATE POLICY "Authenticated can view vehicles" ON public.vehicles FOR SELECT TO authenticated USING (true)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='vehicles' AND cmd='INSERT') THEN
    EXECUTE 'CREATE POLICY "Authenticated can insert vehicles" ON public.vehicles FOR INSERT TO authenticated WITH CHECK (true)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='vehicles' AND cmd='UPDATE') THEN
    EXECUTE 'CREATE POLICY "Authenticated can update vehicles" ON public.vehicles FOR UPDATE TO authenticated USING (true) WITH CHECK (true)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='vehicles' AND cmd='DELETE') THEN
    EXECUTE 'CREATE POLICY "Authenticated can delete vehicles" ON public.vehicles FOR DELETE TO authenticated USING (true)';
  END IF;
END $$;

-- ============ journal_entry_lines ============
DROP POLICY IF EXISTS "Public can view journal_entry_lines" ON public.journal_entry_lines;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.journal_entry_lines;
CREATE POLICY "Authenticated can view journal_entry_lines"
ON public.journal_entry_lines FOR SELECT TO authenticated
USING (true);

-- ============ watched_accounts ============
DROP POLICY IF EXISTS "Public can view watched_accounts" ON public.watched_accounts;
DROP POLICY IF EXISTS "Public can insert watched_accounts" ON public.watched_accounts;
DROP POLICY IF EXISTS "Public can delete watched_accounts" ON public.watched_accounts;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.watched_accounts;
DROP POLICY IF EXISTS "Enable insert for all users" ON public.watched_accounts;
DROP POLICY IF EXISTS "Enable delete for all users" ON public.watched_accounts;
CREATE POLICY "Authenticated can manage watched_accounts"
ON public.watched_accounts FOR ALL TO authenticated
USING (true) WITH CHECK (true);

-- ============ delivery_system_users: explicit admin-only SELECT ============
DROP POLICY IF EXISTS "delivery_system_users_select" ON public.delivery_system_users;
CREATE POLICY "Only admins can view delivery_system_users"
ON public.delivery_system_users FOR SELECT TO authenticated
USING (public.is_org_admin(auth.uid()));

-- ============ zatca_certificates: restrict private key to admins ============
DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='zatca_certificates' AND cmd='SELECT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.zatca_certificates', pol.policyname);
  END LOOP;
END $$;
CREATE POLICY "Only admins can view zatca_certificates"
ON public.zatca_certificates FOR SELECT TO authenticated
USING (public.is_org_admin(auth.uid()));

-- ============ user_roles: remove privilege escalation bootstrap ============
DROP POLICY IF EXISTS "Only admins can insert roles" ON public.user_roles;
CREATE POLICY "Only admins can insert roles"
ON public.user_roles FOR INSERT TO authenticated
WITH CHECK (public.is_org_admin(auth.uid()));
