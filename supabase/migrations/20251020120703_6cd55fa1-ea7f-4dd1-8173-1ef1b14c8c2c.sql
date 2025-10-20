-- حذف الفئة القديمة (من 40-44 كيلو) من جميع الشركات
DELETE FROM company_driver_commissions
WHERE commission_type = 'weight_40_44';