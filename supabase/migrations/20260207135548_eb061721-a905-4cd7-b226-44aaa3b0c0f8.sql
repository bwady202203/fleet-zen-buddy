
-- دالة لإنشاء أسطر قيود العهد تلقائياً
CREATE OR REPLACE FUNCTION public.auto_create_custody_journal_lines()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_representative_id UUID;
  v_expense_date DATE;
  v_ref_match TEXT[];
  v_expense RECORD;
  v_tax_account_id UUID;
  v_total_amount NUMERIC := 0;
  v_total_tax NUMERIC := 0;
  v_base_amount NUMERIC;
  v_tax_amount NUMERIC;
  v_rep_account RECORD;
BEGIN
  -- التحقق من أن المرجع يبدأ بـ custody_daily_
  IF NEW.reference IS NULL OR NEW.reference NOT LIKE 'custody_daily_%' THEN
    RETURN NEW;
  END IF;

  -- التحقق من عدم وجود سطور مسبقاً
  IF EXISTS (SELECT 1 FROM journal_entry_lines WHERE journal_entry_id = NEW.id) THEN
    RETURN NEW;
  END IF;

  -- استخراج معرف المندوب والتاريخ من المرجع
  -- النمط: custody_daily_{uuid}_{yyyy-mm-dd}
  v_ref_match := regexp_match(NEW.reference, 'custody_daily_([a-f0-9\-]+)_(\d{4}-\d{2}-\d{2})');
  
  IF v_ref_match IS NULL THEN
    RETURN NEW;
  END IF;

  v_representative_id := v_ref_match[1]::UUID;
  v_expense_date := v_ref_match[2]::DATE;

  -- جلب حساب الضريبة
  SELECT id INTO v_tax_account_id
  FROM chart_of_accounts
  WHERE code = '110801'
  LIMIT 1;

  -- جلب معلومات حساب المندوب
  SELECT id, name_ar INTO v_rep_account
  FROM chart_of_accounts
  WHERE id = v_representative_id;

  IF v_rep_account.id IS NULL THEN
    RAISE WARNING 'Representative account not found: %', v_representative_id;
    RETURN NEW;
  END IF;

  -- معالجة كل مصروف
  FOR v_expense IN 
    SELECT 
      ce.id,
      ce.amount,
      ce.expense_type,
      ce.description,
      coa.name_ar as expense_account_name
    FROM custody_expenses ce
    LEFT JOIN chart_of_accounts coa ON coa.id = ce.expense_type
    WHERE ce.representative_id = v_representative_id
      AND ce.expense_date = v_expense_date
  LOOP
    -- حساب المبلغ الأساسي والضريبة (15%)
    v_base_amount := ROUND(v_expense.amount / 1.15, 2);
    v_tax_amount := ROUND(v_expense.amount - v_base_amount, 2);

    -- إضافة سطر المدين (حساب المصروف)
    INSERT INTO journal_entry_lines (
      journal_entry_id,
      account_id,
      debit,
      credit,
      description
    ) VALUES (
      NEW.id,
      v_expense.expense_type,
      v_base_amount,
      0,
      COALESCE(v_expense.description, v_expense.expense_account_name, '')
    );

    -- تجميع الضريبة والإجمالي
    v_total_tax := v_total_tax + v_tax_amount;
    v_total_amount := v_total_amount + v_expense.amount;
  END LOOP;

  -- إضافة سطر الضريبة إن وجدت
  IF v_tax_account_id IS NOT NULL AND v_total_tax > 0.01 THEN
    INSERT INTO journal_entry_lines (
      journal_entry_id,
      account_id,
      debit,
      credit,
      description
    ) VALUES (
      NEW.id,
      v_tax_account_id,
      v_total_tax,
      0,
      'ضريبة القيمة المضافة 15%'
    );
  END IF;

  -- إضافة سطر الدائن (حساب المندوب)
  IF v_total_amount > 0 THEN
    INSERT INTO journal_entry_lines (
      journal_entry_id,
      account_id,
      debit,
      credit,
      description
    ) VALUES (
      NEW.id,
      v_representative_id,
      0,
      v_total_amount,
      'مصروفات ' || COALESCE(v_rep_account.name_ar, '')
    );
  END IF;

  RETURN NEW;
END;
$$;

-- إنشاء الـ Trigger
DROP TRIGGER IF EXISTS trigger_auto_create_custody_journal_lines ON journal_entries;

CREATE TRIGGER trigger_auto_create_custody_journal_lines
  AFTER INSERT ON journal_entries
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_custody_journal_lines();
