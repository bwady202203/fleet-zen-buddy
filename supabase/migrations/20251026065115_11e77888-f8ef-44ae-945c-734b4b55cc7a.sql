
-- ترحيل جميع القيود الموجودة إلى دفتر الأستاذ

-- أولاً: حذف جميع القيود الحالية في دفتر الأستاذ لإعادة بناءها بشكل صحيح
TRUNCATE TABLE public.ledger_entries;

-- إعادة بناء دفتر الأستاذ من جميع القيود المحاسبية الموجودة
INSERT INTO public.ledger_entries (
  account_id,
  entry_date,
  description,
  reference,
  debit,
  credit,
  balance,
  branch_id,
  journal_entry_id,
  organization_id,
  created_by
)
SELECT 
  jel.account_id,
  je.date as entry_date,
  jel.description,
  je.entry_number as reference,
  COALESCE(jel.debit, 0) as debit,
  COALESCE(jel.credit, 0) as credit,
  0 as balance, -- سيتم حسابه لاحقاً
  jel.branch_id,
  jel.journal_entry_id,
  je.organization_id,
  je.created_by
FROM public.journal_entry_lines jel
INNER JOIN public.journal_entries je ON je.id = jel.journal_entry_id
ORDER BY je.date, je.created_at, jel.id;

-- حساب الأرصدة التراكمية لكل حساب
-- نستخدم window function لحساب الرصيد التراكمي
WITH ledger_with_running_balance AS (
  SELECT 
    id,
    account_id,
    entry_date,
    debit,
    credit,
    SUM(COALESCE(debit, 0) - COALESCE(credit, 0)) OVER (
      PARTITION BY account_id 
      ORDER BY entry_date, created_at
      ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) as running_balance
  FROM public.ledger_entries
)
UPDATE public.ledger_entries le
SET balance = lwrb.running_balance
FROM ledger_with_running_balance lwrb
WHERE le.id = lwrb.id;

-- تحديث أرصدة الحسابات في شجرة الحسابات
UPDATE public.chart_of_accounts coa
SET balance = (
  SELECT COALESCE(SUM(debit), 0) - COALESCE(SUM(credit), 0)
  FROM public.ledger_entries le
  WHERE le.account_id = coa.id
)
WHERE coa.is_active = true;
