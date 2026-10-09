ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES public.chart_of_accounts(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.hr_journal_settings (
  organization_id uuid PRIMARY KEY,
  employees_parent_account_id uuid REFERENCES public.chart_of_accounts(id),
  salary_expense_account_id uuid REFERENCES public.chart_of_accounts(id),
  payment_account_id uuid REFERENCES public.chart_of_accounts(id),
  violation_account_id uuid REFERENCES public.chart_of_accounts(id),
  auto_post boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.hr_journal_settings TO authenticated;
GRANT ALL ON public.hr_journal_settings TO service_role;
ALTER TABLE public.hr_journal_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members read hr settings" ON public.hr_journal_settings FOR SELECT TO authenticated USING (public.user_in_org(auth.uid(), organization_id));
CREATE POLICY "org members insert hr settings" ON public.hr_journal_settings FOR INSERT TO authenticated WITH CHECK (public.user_in_org(auth.uid(), organization_id));
CREATE POLICY "org members update hr settings" ON public.hr_journal_settings FOR UPDATE TO authenticated USING (public.user_in_org(auth.uid(), organization_id));

INSERT INTO public.hr_journal_settings (organization_id, employees_parent_account_id, salary_expense_account_id, payment_account_id, violation_account_id)
VALUES ('8449f832-4c11-4f27-b650-294106680b15','a4115d55-3209-4fe9-bc40-ac34c5ff172c','4a2f6b6f-df70-4163-b068-a99bb69e7138','2edc3d0d-7582-4173-81f2-4b547ad32874','1caa0c30-b8fc-4bb8-a765-071fa8ed77be')
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.hr_employee_account(p_employee_id uuid, p_create boolean DEFAULT true)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_emp record; v_parent record; v_code text; v_id uuid; v_org uuid;
BEGIN
  SELECT * INTO v_emp FROM employees WHERE id = p_employee_id;
  IF v_emp.id IS NULL THEN RAISE EXCEPTION 'employee not found'; END IF;
  IF v_emp.account_id IS NOT NULL THEN RETURN v_emp.account_id; END IF;
  IF NOT p_create THEN RETURN NULL; END IF;
  v_org := COALESCE(v_emp.organization_id, '8449f832-4c11-4f27-b650-294106680b15');
  SELECT a.* INTO v_parent FROM hr_journal_settings s JOIN chart_of_accounts a ON a.id = s.employees_parent_account_id WHERE s.organization_id = v_org;
  IF v_parent.id IS NULL THEN RAISE EXCEPTION 'employees parent account not configured'; END IF;
  SELECT v_parent.code || LPAD((COALESCE(MAX(NULLIF(regexp_replace(substring(code from length(v_parent.code)+1),'\D','','g'),'')::bigint),0)+1)::text, 3, '0')
    INTO v_code FROM chart_of_accounts WHERE parent_id = v_parent.id;
  INSERT INTO chart_of_accounts (code, name_ar, name_en, type, parent_id, organization_id, is_active, balance)
  VALUES (v_code, 'الموظف / ' || v_emp.name, 'Employee / ' || v_emp.name, v_parent.type, v_parent.id, v_parent.organization_id, true, 0)
  RETURNING id INTO v_id;
  UPDATE employees SET account_id = v_id WHERE id = v_emp.id;
  RETURN v_id;
END $$;

-- event: salary_accrual | salary_payment | advance | violation
CREATE OR REPLACE FUNCTION public.hr_post_journal(p_event text, p_employee_id uuid, p_amount numeric, p_date date, p_description text DEFAULT NULL, p_reference text DEFAULT NULL, p_preview boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_emp record; v_s record; v_emp_acc uuid; v_dr uuid; v_cr uuid; v_label text; v_desc text;
  v_year text; v_max text; v_num text; v_je uuid; v_amt numeric; v_org uuid; v_lines jsonb;
BEGIN
  v_amt := round(abs(COALESCE(p_amount,0)), 2);
  IF v_amt <= 0 THEN RAISE EXCEPTION 'amount must be greater than zero'; END IF;
  SELECT * INTO v_emp FROM employees WHERE id = p_employee_id;
  IF v_emp.id IS NULL THEN RAISE EXCEPTION 'employee not found'; END IF;
  v_org := COALESCE(v_emp.organization_id, '8449f832-4c11-4f27-b650-294106680b15');
  SELECT * INTO v_s FROM hr_journal_settings WHERE organization_id = v_org;
  IF v_s.organization_id IS NULL THEN RAISE EXCEPTION 'hr journal settings missing'; END IF;
  IF p_reference IS NOT NULL AND NOT p_preview AND EXISTS (SELECT 1 FROM journal_entries WHERE reference = p_reference) THEN
    RETURN jsonb_build_object('status','exists','reference',p_reference);
  END IF;
  v_emp_acc := hr_employee_account(p_employee_id, NOT p_preview);
  CASE p_event
    WHEN 'salary_accrual' THEN v_dr := v_s.salary_expense_account_id; v_cr := v_emp_acc; v_label := 'إثبات راتب';
    WHEN 'salary_payment' THEN v_dr := v_emp_acc; v_cr := v_s.payment_account_id; v_label := 'صرف راتب';
    WHEN 'advance' THEN v_dr := v_emp_acc; v_cr := v_s.payment_account_id; v_label := 'صرف سلفة';
    WHEN 'violation' THEN v_dr := v_emp_acc; v_cr := v_s.violation_account_id; v_label := 'تحميل مخالفة';
    ELSE RAISE EXCEPTION 'unknown event %', p_event;
  END CASE;
  v_desc := v_label || ' - ' || v_emp.name || COALESCE(' - ' || NULLIF(p_description,''), '');
  v_lines := jsonb_build_array(
    jsonb_build_object('account_id', v_dr, 'account', COALESCE((SELECT code||' - '||name_ar FROM chart_of_accounts WHERE id=v_dr), 'الموظف / '||v_emp.name||' (سيُنشأ)'), 'debit', v_amt, 'credit', 0),
    jsonb_build_object('account_id', v_cr, 'account', COALESCE((SELECT code||' - '||name_ar FROM chart_of_accounts WHERE id=v_cr), 'الموظف / '||v_emp.name||' (سيُنشأ)'), 'debit', 0, 'credit', v_amt));
  IF p_preview THEN
    RETURN jsonb_build_object('status','preview','date',p_date,'description',v_desc,'lines',v_lines);
  END IF;
  IF v_dr IS NULL OR v_cr IS NULL THEN RAISE EXCEPTION 'accounts not configured'; END IF;
  v_year := EXTRACT(YEAR FROM p_date)::text;
  SELECT entry_number INTO v_max FROM journal_entries WHERE entry_number ~ ('^JE-' || v_year || '[0-9]{6}$') ORDER BY entry_number DESC LIMIT 1;
  v_num := 'JE-' || v_year || LPAD((COALESCE(RIGHT(v_max,6)::int,0)+1)::text, 6, '0');
  INSERT INTO journal_entries (entry_number, date, description, reference, organization_id, universal_serial, created_by)
  VALUES (v_num, p_date, v_desc, p_reference, v_org, generate_universal_serial('JE'), auth.uid())
  RETURNING id INTO v_je;
  INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit, description) VALUES
    (v_je, v_dr, v_amt, 0, v_desc), (v_je, v_cr, 0, v_amt, v_desc);
  RETURN jsonb_build_object('status','posted','journal_entry_id',v_je,'entry_number',v_num,'description',v_desc,'lines',v_lines);
END $$;
GRANT EXECUTE ON FUNCTION public.hr_post_journal(text, uuid, numeric, date, text, text, boolean) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.trg_hr_txn_journal()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_event text; v_auto boolean;
BEGIN
  v_event := CASE NEW.type WHEN 'salary_accrual' THEN 'salary_accrual' WHEN 'salary_payment' THEN 'salary_payment'
    WHEN 'deduction' THEN 'violation' WHEN 'violation' THEN 'violation' ELSE NULL END;
  IF v_event IS NULL OR COALESCE(NEW.amount,0) = 0 THEN RETURN NEW; END IF;
  SELECT s.auto_post INTO v_auto FROM hr_journal_settings s JOIN employees e ON COALESCE(e.organization_id,'8449f832-4c11-4f27-b650-294106680b15') = s.organization_id WHERE e.id = NEW.employee_id;
  IF NOT COALESCE(v_auto,false) THEN RETURN NEW; END IF;
  PERFORM hr_post_journal(v_event, NEW.employee_id, NEW.amount, NEW.date, NEW.description, 'hr_txn_' || NEW.id, false);
  RETURN NEW;
END $$;
CREATE TRIGGER hr_txn_auto_journal AFTER INSERT ON public.employee_transactions FOR EACH ROW EXECUTE FUNCTION public.trg_hr_txn_journal();

CREATE OR REPLACE FUNCTION public.trg_hr_advance_journal()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_auto boolean;
BEGIN
  IF NEW.status <> 'approved' OR (TG_OP = 'UPDATE' AND OLD.status IN ('approved','due','partially_paid','completed','paid','deducted')) THEN RETURN NEW; END IF;
  IF NEW.employee_id IS NULL THEN RETURN NEW; END IF;
  SELECT auto_post INTO v_auto FROM hr_journal_settings WHERE organization_id = COALESCE(NEW.organization_id,'8449f832-4c11-4f27-b650-294106680b15');
  IF NOT COALESCE(v_auto,false) THEN RETURN NEW; END IF;
  PERFORM hr_post_journal('advance', NEW.employee_id, NEW.amount, NEW.advance_date, 'سلفة رقم ' || COALESCE(NEW.advance_number,''), 'hr_advance_' || NEW.id, false);
  RETURN NEW;
END $$;
CREATE TRIGGER hr_advance_auto_journal AFTER INSERT OR UPDATE OF status ON public.employee_advances FOR EACH ROW EXECUTE FUNCTION public.trg_hr_advance_journal();