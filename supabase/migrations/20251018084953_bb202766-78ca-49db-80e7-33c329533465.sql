-- تحديث سياسات RLS لجدول طلبات الصيانة
DROP POLICY IF EXISTS "Admins and managers can manage maintenance" ON public.maintenance_requests;
DROP POLICY IF EXISTS "Authenticated users can create maintenance" ON public.maintenance_requests;
DROP POLICY IF EXISTS "Authenticated users can view maintenance" ON public.maintenance_requests;

CREATE POLICY "Users can manage maintenance requests"
ON public.maintenance_requests
FOR ALL
USING (
  organization_id IS NULL 
  OR organization_id = get_user_organization(auth.uid())
  OR has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'manager'::app_role)
)
WITH CHECK (
  organization_id IS NULL 
  OR organization_id = get_user_organization(auth.uid())
);

CREATE POLICY "Users can view maintenance requests"
ON public.maintenance_requests
FOR SELECT
USING (
  organization_id IS NULL 
  OR organization_id = get_user_organization(auth.uid())
);

-- تحديث سياسات RLS لجدول سجلات الكيلومترات
DROP POLICY IF EXISTS "Admins can manage mileage records" ON public.mileage_records;
DROP POLICY IF EXISTS "Authenticated users can create mileage records" ON public.mileage_records;
DROP POLICY IF EXISTS "Authenticated users can view mileage records" ON public.mileage_records;

CREATE POLICY "Users can manage mileage records"
ON public.mileage_records
FOR ALL
USING (
  organization_id IS NULL 
  OR organization_id = get_user_organization(auth.uid())
  OR has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  organization_id IS NULL 
  OR organization_id = get_user_organization(auth.uid())
);

CREATE POLICY "Users can view mileage records"
ON public.mileage_records
FOR SELECT
USING (
  organization_id IS NULL 
  OR organization_id = get_user_organization(auth.uid())
);

-- تحديث سياسات RLS لجدول سجلات تغيير الزيت
DROP POLICY IF EXISTS "Admins can manage oil changes" ON public.oil_change_records;
DROP POLICY IF EXISTS "Authenticated users can create oil changes" ON public.oil_change_records;
DROP POLICY IF EXISTS "Authenticated users can view oil changes" ON public.oil_change_records;

CREATE POLICY "Users can manage oil change records"
ON public.oil_change_records
FOR ALL
USING (
  organization_id IS NULL 
  OR organization_id = get_user_organization(auth.uid())
  OR has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  organization_id IS NULL 
  OR organization_id = get_user_organization(auth.uid())
);

CREATE POLICY "Users can view oil change records"
ON public.oil_change_records
FOR SELECT
USING (
  organization_id IS NULL 
  OR organization_id = get_user_organization(auth.uid())
);