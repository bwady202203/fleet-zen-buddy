-- إضافة الحسابات الافتراضية مع 3 مستويات

-- المستوى الأول: الحسابات الرئيسية
INSERT INTO chart_of_accounts (code, name_ar, name_en, type, parent_id, is_active) VALUES
-- الأصول
('1', 'الأصول', 'Assets', 'asset', NULL, true),
-- الخصوم
('2', 'الخصوم', 'Liabilities', 'liability', NULL, true),
-- حقوق الملكية
('3', 'حقوق الملكية', 'Equity', 'equity', NULL, true),
-- الإيرادات
('4', 'الإيرادات', 'Revenue', 'revenue', NULL, true),
-- المصروفات
('5', 'المصروفات', 'Expenses', 'expense', NULL, true)
ON CONFLICT DO NOTHING;

-- المستوى الثاني: الحسابات الفرعية الرئيسية
-- الأصول المتداولة
INSERT INTO chart_of_accounts (code, name_ar, name_en, type, parent_id, is_active)
SELECT '11', 'الأصول المتداولة', 'Current Assets', 'asset', id, true
FROM chart_of_accounts WHERE code = '1'
ON CONFLICT DO NOTHING;

-- الأصول الثابتة
INSERT INTO chart_of_accounts (code, name_ar, name_en, type, parent_id, is_active)
SELECT '12', 'الأصول الثابتة', 'Fixed Assets', 'asset', id, true
FROM chart_of_accounts WHERE code = '1'
ON CONFLICT DO NOTHING;

-- الخصوم المتداولة
INSERT INTO chart_of_accounts (code, name_ar, name_en, type, parent_id, is_active)
SELECT '21', 'الخصوم المتداولة', 'Current Liabilities', 'liability', id, true
FROM chart_of_accounts WHERE code = '2'
ON CONFLICT DO NOTHING;

-- الخصوم طويلة الأجل
INSERT INTO chart_of_accounts (code, name_ar, name_en, type, parent_id, is_active)
SELECT '22', 'الخصوم طويلة الأجل', 'Long-term Liabilities', 'liability', id, true
FROM chart_of_accounts WHERE code = '2'
ON CONFLICT DO NOTHING;

-- رأس المال
INSERT INTO chart_of_accounts (code, name_ar, name_en, type, parent_id, is_active)
SELECT '31', 'رأس المال', 'Capital', 'equity', id, true
FROM chart_of_accounts WHERE code = '3'
ON CONFLICT DO NOTHING;

-- الأرباح المحتجزة
INSERT INTO chart_of_accounts (code, name_ar, name_en, type, parent_id, is_active)
SELECT '32', 'الأرباح المحتجزة', 'Retained Earnings', 'equity', id, true
FROM chart_of_accounts WHERE code = '3'
ON CONFLICT DO NOTHING;

-- إيرادات المبيعات
INSERT INTO chart_of_accounts (code, name_ar, name_en, type, parent_id, is_active)
SELECT '41', 'إيرادات المبيعات', 'Sales Revenue', 'revenue', id, true
FROM chart_of_accounts WHERE code = '4'
ON CONFLICT DO NOTHING;

-- إيرادات أخرى
INSERT INTO chart_of_accounts (code, name_ar, name_en, type, parent_id, is_active)
SELECT '42', 'إيرادات أخرى', 'Other Revenue', 'revenue', id, true
FROM chart_of_accounts WHERE code = '4'
ON CONFLICT DO NOTHING;

-- مصروفات تشغيلية
INSERT INTO chart_of_accounts (code, name_ar, name_en, type, parent_id, is_active)
SELECT '51', 'مصروفات تشغيلية', 'Operating Expenses', 'expense', id, true
FROM chart_of_accounts WHERE code = '5'
ON CONFLICT DO NOTHING;

-- مصروفات إدارية
INSERT INTO chart_of_accounts (code, name_ar, name_en, type, parent_id, is_active)
SELECT '52', 'مصروفات إدارية', 'Administrative Expenses', 'expense', id, true
FROM chart_of_accounts WHERE code = '5'
ON CONFLICT DO NOTHING;

-- المستوى الثالث: الحسابات التفصيلية
-- النقدية
INSERT INTO chart_of_accounts (code, name_ar, name_en, type, parent_id, is_active)
SELECT '111', 'الصندوق', 'Cash', 'asset', id, true
FROM chart_of_accounts WHERE code = '11'
ON CONFLICT DO NOTHING;

-- البنوك
INSERT INTO chart_of_accounts (code, name_ar, name_en, type, parent_id, is_active)
SELECT '112', 'البنوك', 'Banks', 'asset', id, true
FROM chart_of_accounts WHERE code = '11'
ON CONFLICT DO NOTHING;

-- العملاء
INSERT INTO chart_of_accounts (code, name_ar, name_en, type, parent_id, is_active)
SELECT '113', 'العملاء', 'Accounts Receivable', 'asset', id, true
FROM chart_of_accounts WHERE code = '11'
ON CONFLICT DO NOTHING;

-- المخزون
INSERT INTO chart_of_accounts (code, name_ar, name_en, type, parent_id, is_active)
SELECT '114', 'المخزون', 'Inventory', 'asset', id, true
FROM chart_of_accounts WHERE code = '11'
ON CONFLICT DO NOTHING;

-- الأراضي
INSERT INTO chart_of_accounts (code, name_ar, name_en, type, parent_id, is_active)
SELECT '121', 'الأراضي', 'Land', 'asset', id, true
FROM chart_of_accounts WHERE code = '12'
ON CONFLICT DO NOTHING;

-- المباني
INSERT INTO chart_of_accounts (code, name_ar, name_en, type, parent_id, is_active)
SELECT '122', 'المباني', 'Buildings', 'asset', id, true
FROM chart_of_accounts WHERE code = '12'
ON CONFLICT DO NOTHING;

-- المعدات
INSERT INTO chart_of_accounts (code, name_ar, name_en, type, parent_id, is_active)
SELECT '123', 'المعدات', 'Equipment', 'asset', id, true
FROM chart_of_accounts WHERE code = '12'
ON CONFLICT DO NOTHING;

-- الموردون
INSERT INTO chart_of_accounts (code, name_ar, name_en, type, parent_id, is_active)
SELECT '211', 'الموردون', 'Accounts Payable', 'liability', id, true
FROM chart_of_accounts WHERE code = '21'
ON CONFLICT DO NOTHING;

-- رواتب مستحقة
INSERT INTO chart_of_accounts (code, name_ar, name_en, type, parent_id, is_active)
SELECT '212', 'رواتب مستحقة', 'Salaries Payable', 'liability', id, true
FROM chart_of_accounts WHERE code = '21'
ON CONFLICT DO NOTHING;

-- قروض طويلة الأجل
INSERT INTO chart_of_accounts (code, name_ar, name_en, type, parent_id, is_active)
SELECT '221', 'قروض طويلة الأجل', 'Long-term Loans', 'liability', id, true
FROM chart_of_accounts WHERE code = '22'
ON CONFLICT DO NOTHING;

-- مبيعات بضاعة
INSERT INTO chart_of_accounts (code, name_ar, name_en, type, parent_id, is_active)
SELECT '411', 'مبيعات بضاعة', 'Merchandise Sales', 'revenue', id, true
FROM chart_of_accounts WHERE code = '41'
ON CONFLICT DO NOTHING;

-- مبيعات خدمات
INSERT INTO chart_of_accounts (code, name_ar, name_en, type, parent_id, is_active)
SELECT '412', 'مبيعات خدمات', 'Service Revenue', 'revenue', id, true
FROM chart_of_accounts WHERE code = '41'
ON CONFLICT DO NOTHING;

-- أرباح استثمارات
INSERT INTO chart_of_accounts (code, name_ar, name_en, type, parent_id, is_active)
SELECT '421', 'أرباح استثمارات', 'Investment Income', 'revenue', id, true
FROM chart_of_accounts WHERE code = '42'
ON CONFLICT DO NOTHING;

-- رواتب وأجور
INSERT INTO chart_of_accounts (code, name_ar, name_en, type, parent_id, is_active)
SELECT '511', 'رواتب وأجور', 'Salaries and Wages', 'expense', id, true
FROM chart_of_accounts WHERE code = '51'
ON CONFLICT DO NOTHING;

-- إيجارات
INSERT INTO chart_of_accounts (code, name_ar, name_en, type, parent_id, is_active)
SELECT '512', 'إيجارات', 'Rent Expense', 'expense', id, true
FROM chart_of_accounts WHERE code = '51'
ON CONFLICT DO NOTHING;

-- كهرباء ومياه
INSERT INTO chart_of_accounts (code, name_ar, name_en, type, parent_id, is_active)
SELECT '513', 'كهرباء ومياه', 'Utilities', 'expense', id, true
FROM chart_of_accounts WHERE code = '51'
ON CONFLICT DO NOTHING;

-- مصروفات مكتبية
INSERT INTO chart_of_accounts (code, name_ar, name_en, type, parent_id, is_active)
SELECT '521', 'مصروفات مكتبية', 'Office Supplies', 'expense', id, true
FROM chart_of_accounts WHERE code = '52'
ON CONFLICT DO NOTHING;

-- مصروفات هاتف وإنترنت
INSERT INTO chart_of_accounts (code, name_ar, name_en, type, parent_id, is_active)
SELECT '522', 'مصروفات هاتف وإنترنت', 'Phone and Internet', 'expense', id, true
FROM chart_of_accounts WHERE code = '52'
ON CONFLICT DO NOTHING;