
DO $$
DECLARE
  v_org uuid := '8449f832-4c11-4f27-b650-294106680b15';
  v_table text;
  v_tables text[] := ARRAY[
    'companies','drivers','loads','load_invoices','load_types',
    'company_load_type_prices','company_driver_commissions',
    'journal_entries','custody_expenses','chart_of_accounts',
    'payment_receipts','loads_reports','company_loads_reports',
    'driver_commissions_reports','advanced_loads_reports',
    'custody_journal_entries','custody_transfers','custody_representatives',
    'maintenance_requests','maintenance_cost_items','mileage_records',
    'oil_change_records','spare_parts','spare_parts_purchases','stock_transactions',
    'collection_receipts','payment_vouchers','invoices','driver_payments',
    'employees','employee_transactions','attendance_records','leaves',
    'vehicles','ledger_entries','trial_balance_entries','suppliers',
    'transfer_requests','company_settings','delivery_receipts',
    'driver_transfer_receipts','maintenance_purchase_invoices'
  ];
BEGIN
  FOREACH v_table IN ARRAY v_tables LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name=v_table AND column_name='organization_id'
    ) THEN
      EXECUTE format('UPDATE public.%I SET organization_id = %L WHERE organization_id IS NULL', v_table, v_org);
    END IF;
  END LOOP;
END $$;
