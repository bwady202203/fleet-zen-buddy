-- إنشاء الحسابات الأساسية لنظام العهد

-- حساب الأصول الرئيسي
INSERT INTO public.chart_of_accounts (code, name_ar, name_en, type, parent_id, is_active)
VALUES ('1', 'الأصول', 'Assets', 'asset', NULL, true)
ON CONFLICT DO NOTHING;

-- حساب الأصول المتداولة
INSERT INTO public.chart_of_accounts (code, name_ar, name_en, type, parent_id, is_active)
SELECT '11', 'الأصول المتداولة', 'Current Assets', 'asset', id, true
FROM public.chart_of_accounts
WHERE code = '1' AND name_ar = 'الأصول'
ON CONFLICT DO NOTHING;

-- حساب العهد
INSERT INTO public.chart_of_accounts (code, name_ar, name_en, type, parent_id, is_active)
SELECT '1102', 'العهد', 'Custody', 'asset', id, true
FROM public.chart_of_accounts
WHERE code = '11' AND name_ar = 'الأصول المتداولة'
ON CONFLICT DO NOTHING;

-- حساب حقوق الملكية
INSERT INTO public.chart_of_accounts (code, name_ar, name_en, type, parent_id, is_active)
VALUES ('3', 'حقوق الملكية', 'Equity', 'equity', NULL, true)
ON CONFLICT DO NOTHING;

-- حساب رأس المال
INSERT INTO public.chart_of_accounts (code, name_ar, name_en, type, parent_id, is_active)
SELECT '31', 'رأس المال', 'Capital', 'equity', id, true
FROM public.chart_of_accounts
WHERE code = '3' AND name_ar = 'حقوق الملكية'
ON CONFLICT DO NOTHING;

-- حساب المصروفات
INSERT INTO public.chart_of_accounts (code, name_ar, name_en, type, parent_id, is_active)
VALUES ('5', 'المصروفات', 'Expenses', 'expense', NULL, true)
ON CONFLICT DO NOTHING;