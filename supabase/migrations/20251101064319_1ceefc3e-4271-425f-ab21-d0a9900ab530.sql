-- إضافة سياسة RLS للسماح بقراءة المركبات
DROP POLICY IF EXISTS "Enable read access for all users" ON vehicles;

CREATE POLICY "Enable read access for all users" 
ON vehicles 
FOR SELECT 
USING (true);

-- إضافة سياسات للعمليات الأخرى
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON vehicles;
CREATE POLICY "Enable insert for authenticated users" 
ON vehicles 
FOR INSERT 
WITH CHECK (true);

DROP POLICY IF EXISTS "Enable update for authenticated users" ON vehicles;
CREATE POLICY "Enable update for authenticated users" 
ON vehicles 
FOR UPDATE 
USING (true);

DROP POLICY IF EXISTS "Enable delete for authenticated users" ON vehicles;
CREATE POLICY "Enable delete for authenticated users" 
ON vehicles 
FOR DELETE 
USING (true);