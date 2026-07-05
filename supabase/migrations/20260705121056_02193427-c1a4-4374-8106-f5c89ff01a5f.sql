
-- ============================================================
-- Security hardening: restrict policies to authenticated users
-- and add organization scoping where missing.
-- ============================================================

-- Helper: drop-and-recreate policy pattern using authenticated role
-- and (organization_id = get_user_organization(auth.uid())) scoping.

-- =========== companies ===========
DROP POLICY IF EXISTS "Users can manage companies" ON public.companies;
DROP POLICY IF EXISTS "Users can view companies" ON public.companies;
CREATE POLICY "Users can view companies" ON public.companies
  FOR SELECT TO authenticated
  USING (organization_id = get_user_organization(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can manage companies" ON public.companies
  FOR ALL TO authenticated
  USING (organization_id = get_user_organization(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (organization_id = get_user_organization(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

-- =========== drivers ===========
DROP POLICY IF EXISTS "Users can manage drivers" ON public.drivers;
DROP POLICY IF EXISTS "Users can view drivers" ON public.drivers;
CREATE POLICY "Users can view drivers" ON public.drivers
  FOR SELECT TO authenticated
  USING (organization_id = get_user_organization(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can manage drivers" ON public.drivers
  FOR ALL TO authenticated
  USING (organization_id = get_user_organization(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (organization_id = get_user_organization(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

-- =========== establishments (no organization_id) ===========
DROP POLICY IF EXISTS "Anyone can view establishments" ON public.establishments;
DROP POLICY IF EXISTS "Authenticated can insert establishments" ON public.establishments;
DROP POLICY IF EXISTS "Authenticated can delete establishments" ON public.establishments;
CREATE POLICY "Authenticated can view establishments" ON public.establishments
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert establishments" ON public.establishments
  FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update establishments" ON public.establishments
  FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete establishments" ON public.establishments
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- =========== Financial tables: change public -> authenticated, drop IS NULL fallback ===========
-- journal_entries
DROP POLICY IF EXISTS "Users can manage journal entries" ON public.journal_entries;
DROP POLICY IF EXISTS "Users can view journal entries" ON public.journal_entries;
CREATE POLICY "Users can view journal entries" ON public.journal_entries
  FOR SELECT TO authenticated
  USING (organization_id = get_user_organization(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can manage journal entries" ON public.journal_entries
  FOR ALL TO authenticated
  USING (organization_id = get_user_organization(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (organization_id = get_user_organization(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

-- journal_entry_lines: scope by parent journal_entries org
DROP POLICY IF EXISTS "Authenticated can view journal_entry_lines" ON public.journal_entry_lines;
DROP POLICY IF EXISTS "Users can manage journal lines" ON public.journal_entry_lines;
CREATE POLICY "Users can view journal entry lines" ON public.journal_entry_lines
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.journal_entries je
    WHERE je.id = journal_entry_lines.journal_entry_id
      AND (je.organization_id = get_user_organization(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role))
  ));
CREATE POLICY "Users can manage journal entry lines" ON public.journal_entry_lines
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.journal_entries je
    WHERE je.id = journal_entry_lines.journal_entry_id
      AND (je.organization_id = get_user_organization(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role))
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.journal_entries je
    WHERE je.id = journal_entry_lines.journal_entry_id
      AND (je.organization_id = get_user_organization(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role))
  ));

-- custody_expenses
DROP POLICY IF EXISTS "Users can manage custody expenses" ON public.custody_expenses;
DROP POLICY IF EXISTS "Users can view custody expenses" ON public.custody_expenses;
CREATE POLICY "Users can view custody expenses" ON public.custody_expenses
  FOR SELECT TO authenticated
  USING (organization_id = get_user_organization(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can manage custody expenses" ON public.custody_expenses
  FOR ALL TO authenticated
  USING (organization_id = get_user_organization(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (organization_id = get_user_organization(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

-- load_invoices
DROP POLICY IF EXISTS "Users can manage load invoices" ON public.load_invoices;
DROP POLICY IF EXISTS "Users can view load invoices" ON public.load_invoices;
CREATE POLICY "Users can view load invoices" ON public.load_invoices
  FOR SELECT TO authenticated
  USING (organization_id = get_user_organization(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can manage load invoices" ON public.load_invoices
  FOR ALL TO authenticated
  USING (organization_id = get_user_organization(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (organization_id = get_user_organization(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

-- load_invoice_items (scope via parent load_invoices)
DROP POLICY IF EXISTS "Users can manage load invoice items" ON public.load_invoice_items;
DROP POLICY IF EXISTS "Users can view load invoice items" ON public.load_invoice_items;
CREATE POLICY "Users can view load invoice items" ON public.load_invoice_items
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.load_invoices li
    WHERE li.id = load_invoice_items.invoice_id
      AND (li.organization_id = get_user_organization(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role))
  ));
CREATE POLICY "Users can manage load invoice items" ON public.load_invoice_items
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.load_invoices li
    WHERE li.id = load_invoice_items.invoice_id
      AND (li.organization_id = get_user_organization(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role))
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.load_invoices li
    WHERE li.id = load_invoice_items.invoice_id
      AND (li.organization_id = get_user_organization(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role))
  ));

-- chart_of_accounts
DROP POLICY IF EXISTS "Users can manage accounts" ON public.chart_of_accounts;
DROP POLICY IF EXISTS "Users can view accounts" ON public.chart_of_accounts;
CREATE POLICY "Users can view accounts" ON public.chart_of_accounts
  FOR SELECT TO authenticated
  USING (organization_id = get_user_organization(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can manage accounts" ON public.chart_of_accounts
  FOR ALL TO authenticated
  USING (organization_id = get_user_organization(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (organization_id = get_user_organization(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

-- spare_parts_purchases (drop old public policies; keep authenticated ones)
DROP POLICY IF EXISTS "Users can manage purchases" ON public.spare_parts_purchases;
DROP POLICY IF EXISTS "Users can view purchases" ON public.spare_parts_purchases;

-- stock_transactions
DROP POLICY IF EXISTS "Users can manage stock transactions" ON public.stock_transactions;
DROP POLICY IF EXISTS "Users can view stock transactions" ON public.stock_transactions;

-- spare_parts
DROP POLICY IF EXISTS "Users can manage their organization spare parts" ON public.spare_parts;
DROP POLICY IF EXISTS "Users can view their organization spare parts" ON public.spare_parts;
CREATE POLICY "Users can view spare parts" ON public.spare_parts
  FOR SELECT TO authenticated
  USING (organization_id = get_user_organization(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can manage spare parts" ON public.spare_parts
  FOR ALL TO authenticated
  USING (organization_id = get_user_organization(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (organization_id = get_user_organization(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

-- maintenance_requests
DROP POLICY IF EXISTS "Users can manage maintenance requests" ON public.maintenance_requests;
DROP POLICY IF EXISTS "Users can view maintenance requests" ON public.maintenance_requests;
CREATE POLICY "Users can view maintenance requests" ON public.maintenance_requests
  FOR SELECT TO authenticated
  USING (organization_id = get_user_organization(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can manage maintenance requests" ON public.maintenance_requests
  FOR ALL TO authenticated
  USING (organization_id = get_user_organization(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (organization_id = get_user_organization(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

-- maintenance_cost_items
DROP POLICY IF EXISTS "Users can manage maintenance cost items" ON public.maintenance_cost_items;
DROP POLICY IF EXISTS "Users can view maintenance cost items" ON public.maintenance_cost_items;
CREATE POLICY "Users can view maintenance cost items" ON public.maintenance_cost_items
  FOR SELECT TO authenticated
  USING (organization_id = get_user_organization(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can manage maintenance cost items" ON public.maintenance_cost_items
  FOR ALL TO authenticated
  USING (organization_id = get_user_organization(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (organization_id = get_user_organization(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

-- mileage_records
DROP POLICY IF EXISTS "Users can manage mileage records" ON public.mileage_records;
DROP POLICY IF EXISTS "Users can view mileage records" ON public.mileage_records;
CREATE POLICY "Users can view mileage records" ON public.mileage_records
  FOR SELECT TO authenticated
  USING (organization_id = get_user_organization(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can manage mileage records" ON public.mileage_records
  FOR ALL TO authenticated
  USING (organization_id = get_user_organization(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (organization_id = get_user_organization(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

-- payment_receipts
DROP POLICY IF EXISTS "Users can manage payment receipts" ON public.payment_receipts;
DROP POLICY IF EXISTS "Users can view payment receipts" ON public.payment_receipts;
CREATE POLICY "Users can view payment receipts" ON public.payment_receipts
  FOR SELECT TO authenticated
  USING (organization_id = get_user_organization(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can manage payment receipts" ON public.payment_receipts
  FOR ALL TO authenticated
  USING (organization_id = get_user_organization(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (organization_id = get_user_organization(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

-- loads_reports
DROP POLICY IF EXISTS "Users can manage their organization loads reports" ON public.loads_reports;
DROP POLICY IF EXISTS "Users can view their organization loads reports" ON public.loads_reports;
CREATE POLICY "Users can view loads reports" ON public.loads_reports
  FOR SELECT TO authenticated
  USING (organization_id = get_user_organization(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can manage loads reports" ON public.loads_reports
  FOR ALL TO authenticated
  USING (organization_id = get_user_organization(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (organization_id = get_user_organization(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

-- company_loads_reports
DROP POLICY IF EXISTS "Users can manage their organization company reports" ON public.company_loads_reports;
DROP POLICY IF EXISTS "Users can view their organization company reports" ON public.company_loads_reports;
CREATE POLICY "Users can view company loads reports" ON public.company_loads_reports
  FOR SELECT TO authenticated
  USING (organization_id = get_user_organization(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can manage company loads reports" ON public.company_loads_reports
  FOR ALL TO authenticated
  USING (organization_id = get_user_organization(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (organization_id = get_user_organization(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

-- driver_commissions_reports
DROP POLICY IF EXISTS "Users can manage their organization driver reports" ON public.driver_commissions_reports;
DROP POLICY IF EXISTS "Users can view their organization driver reports" ON public.driver_commissions_reports;
CREATE POLICY "Users can view driver commissions reports" ON public.driver_commissions_reports
  FOR SELECT TO authenticated
  USING (organization_id = get_user_organization(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can manage driver commissions reports" ON public.driver_commissions_reports
  FOR ALL TO authenticated
  USING (organization_id = get_user_organization(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (organization_id = get_user_organization(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

-- company_load_type_prices
DROP POLICY IF EXISTS "Users can manage company prices" ON public.company_load_type_prices;
DROP POLICY IF EXISTS "Users can view company prices" ON public.company_load_type_prices;
CREATE POLICY "Users can view company prices" ON public.company_load_type_prices
  FOR SELECT TO authenticated
  USING (organization_id = get_user_organization(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can manage company prices" ON public.company_load_type_prices
  FOR ALL TO authenticated
  USING (organization_id = get_user_organization(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (organization_id = get_user_organization(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

-- company_driver_commissions
DROP POLICY IF EXISTS "Users can manage driver commissions" ON public.company_driver_commissions;
DROP POLICY IF EXISTS "Users can view driver commissions" ON public.company_driver_commissions;
CREATE POLICY "Users can view driver commissions" ON public.company_driver_commissions
  FOR SELECT TO authenticated
  USING (organization_id = get_user_organization(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can manage driver commissions" ON public.company_driver_commissions
  FOR ALL TO authenticated
  USING (organization_id = get_user_organization(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (organization_id = get_user_organization(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

-- load_types
DROP POLICY IF EXISTS "Users can manage load types" ON public.load_types;
DROP POLICY IF EXISTS "Users can view load types" ON public.load_types;
CREATE POLICY "Users can view load types" ON public.load_types
  FOR SELECT TO authenticated
  USING (organization_id = get_user_organization(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can manage load types" ON public.load_types
  FOR ALL TO authenticated
  USING (organization_id = get_user_organization(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (organization_id = get_user_organization(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

-- custody_journal_entries
DROP POLICY IF EXISTS "Users can manage custody journal entries" ON public.custody_journal_entries;
DROP POLICY IF EXISTS "Users can view custody journal entries" ON public.custody_journal_entries;
CREATE POLICY "Users can view custody journal entries" ON public.custody_journal_entries
  FOR SELECT TO authenticated
  USING (organization_id = get_user_organization(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can manage custody journal entries" ON public.custody_journal_entries
  FOR ALL TO authenticated
  USING (organization_id = get_user_organization(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (organization_id = get_user_organization(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

-- advanced_loads_reports
DROP POLICY IF EXISTS "Users can manage their organization reports" ON public.advanced_loads_reports;
DROP POLICY IF EXISTS "Users can view their organization reports" ON public.advanced_loads_reports;
CREATE POLICY "Users can view advanced loads reports" ON public.advanced_loads_reports
  FOR SELECT TO authenticated
  USING (organization_id = get_user_organization(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can manage advanced loads reports" ON public.advanced_loads_reports
  FOR ALL TO authenticated
  USING (organization_id = get_user_organization(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (organization_id = get_user_organization(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

-- =========== transfer_requests ===========
DROP POLICY IF EXISTS "Users can create transfer requests" ON public.transfer_requests;
DROP POLICY IF EXISTS "Users can view transfer requests" ON public.transfer_requests;
DROP POLICY IF EXISTS "Users can update transfer requests" ON public.transfer_requests;
DROP POLICY IF EXISTS "Users can delete transfer requests" ON public.transfer_requests;
DROP POLICY IF EXISTS "Authenticated can manage transfer_requests" ON public.transfer_requests;
CREATE POLICY "Users can view transfer requests" ON public.transfer_requests
  FOR SELECT TO authenticated
  USING (organization_id = get_user_organization(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can manage transfer requests" ON public.transfer_requests
  FOR ALL TO authenticated
  USING (organization_id = get_user_organization(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (organization_id = get_user_organization(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

-- =========== transfer_request_items ===========
DROP POLICY IF EXISTS "Users can create transfer request items" ON public.transfer_request_items;
DROP POLICY IF EXISTS "Users can view transfer request items" ON public.transfer_request_items;
DROP POLICY IF EXISTS "Users can update transfer request items" ON public.transfer_request_items;
DROP POLICY IF EXISTS "Users can delete transfer request items" ON public.transfer_request_items;
DROP POLICY IF EXISTS "Authenticated can manage transfer_request_items" ON public.transfer_request_items;
CREATE POLICY "Users can view transfer request items" ON public.transfer_request_items
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.transfer_requests tr
    WHERE tr.id = transfer_request_items.transfer_request_id
      AND (tr.organization_id = get_user_organization(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role))
  ));
CREATE POLICY "Users can manage transfer request items" ON public.transfer_request_items
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.transfer_requests tr
    WHERE tr.id = transfer_request_items.transfer_request_id
      AND (tr.organization_id = get_user_organization(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role))
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.transfer_requests tr
    WHERE tr.id = transfer_request_items.transfer_request_id
      AND (tr.organization_id = get_user_organization(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role))
  ));

-- =========== watched_accounts ===========
DROP POLICY IF EXISTS "Authenticated can manage watched_accounts" ON public.watched_accounts;
CREATE POLICY "Users can view watched accounts" ON public.watched_accounts
  FOR SELECT TO authenticated
  USING (organization_id = get_user_organization(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can manage watched accounts" ON public.watched_accounts
  FOR ALL TO authenticated
  USING (organization_id = get_user_organization(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (organization_id = get_user_organization(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));
