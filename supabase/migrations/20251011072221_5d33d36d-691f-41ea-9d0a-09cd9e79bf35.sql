-- إزالة check constraint القديم
ALTER TABLE vehicles DROP CONSTRAINT IF EXISTS vehicles_status_check;

-- إضافة check constraint جديد يسمح بالقيم الصحيحة
ALTER TABLE vehicles ADD CONSTRAINT vehicles_status_check 
  CHECK (status IN ('active', 'maintenance', 'warning', 'out-of-service', 'available', 'in_service', 'under_maintenance'));