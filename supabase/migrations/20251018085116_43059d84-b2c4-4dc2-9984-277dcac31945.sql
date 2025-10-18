-- تحديث سياسات RLS لجدول الحمولات
DROP POLICY IF EXISTS "Users can manage their organization loads" ON public.loads;
DROP POLICY IF EXISTS "Users can view their organization loads" ON public.loads;

CREATE POLICY "Users can manage loads"
ON public.loads
FOR ALL
USING (
  organization_id IS NULL 
  OR organization_id = get_user_organization(auth.uid())
)
WITH CHECK (
  organization_id IS NULL 
  OR organization_id = get_user_organization(auth.uid())
);

CREATE POLICY "Users can view loads"
ON public.loads
FOR SELECT
USING (
  organization_id IS NULL 
  OR organization_id = get_user_organization(auth.uid())
);

-- تحديث سياسات RLS لجدول أنواع الحمولات
DROP POLICY IF EXISTS "Admins and managers can manage load types" ON public.load_types;
DROP POLICY IF EXISTS "Authenticated users can view load types" ON public.load_types;

CREATE POLICY "Users can manage load types"
ON public.load_types
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

CREATE POLICY "Users can view load types"
ON public.load_types
FOR SELECT
USING (
  organization_id IS NULL 
  OR organization_id = get_user_organization(auth.uid())
);

-- تحديث سياسات RLS لجدول فواتير الحمولات
DROP POLICY IF EXISTS "Admins and managers can manage load invoices" ON public.load_invoices;
DROP POLICY IF EXISTS "Authenticated users can view load invoices" ON public.load_invoices;

CREATE POLICY "Users can manage load invoices"
ON public.load_invoices
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

CREATE POLICY "Users can view load invoices"
ON public.load_invoices
FOR SELECT
USING (
  organization_id IS NULL 
  OR organization_id = get_user_organization(auth.uid())
);

-- تحديث سياسات RLS لجدول عناصر فواتير الحمولات
DROP POLICY IF EXISTS "Admins and managers can manage load invoice items" ON public.load_invoice_items;
DROP POLICY IF EXISTS "Authenticated users can view load invoice items" ON public.load_invoice_items;

CREATE POLICY "Users can manage load invoice items"
ON public.load_invoice_items
FOR ALL
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'manager'::app_role)
);

CREATE POLICY "Users can view load invoice items"
ON public.load_invoice_items
FOR SELECT
USING (true);

-- تحديث سياسات RLS لجدول الشركات
DROP POLICY IF EXISTS "Users can manage their organization companies" ON public.companies;
DROP POLICY IF EXISTS "Users can view their organization companies" ON public.companies;

CREATE POLICY "Users can manage companies"
ON public.companies
FOR ALL
USING (
  organization_id IS NULL 
  OR organization_id = get_user_organization(auth.uid())
)
WITH CHECK (
  organization_id IS NULL 
  OR organization_id = get_user_organization(auth.uid())
);

CREATE POLICY "Users can view companies"
ON public.companies
FOR SELECT
USING (
  organization_id IS NULL 
  OR organization_id = get_user_organization(auth.uid())
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- تحديث سياسات RLS لجدول السائقين
DROP POLICY IF EXISTS "Users can manage their organization drivers" ON public.drivers;
DROP POLICY IF EXISTS "Users can view their organization drivers" ON public.drivers;

CREATE POLICY "Users can manage drivers"
ON public.drivers
FOR ALL
USING (
  organization_id IS NULL 
  OR organization_id = get_user_organization(auth.uid())
)
WITH CHECK (
  organization_id IS NULL 
  OR organization_id = get_user_organization(auth.uid())
);

CREATE POLICY "Users can view drivers"
ON public.drivers
FOR SELECT
USING (
  organization_id IS NULL 
  OR organization_id = get_user_organization(auth.uid())
);

-- تحديث سياسات RLS لجدول إيصالات التسليم
DROP POLICY IF EXISTS "Admins and managers can manage delivery receipts" ON public.delivery_receipts;
DROP POLICY IF EXISTS "Authenticated users can view delivery receipts" ON public.delivery_receipts;

CREATE POLICY "Users can manage delivery receipts"
ON public.delivery_receipts
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

CREATE POLICY "Users can view delivery receipts"
ON public.delivery_receipts
FOR SELECT
USING (
  organization_id IS NULL 
  OR organization_id = get_user_organization(auth.uid())
);

-- تحديث سياسات RLS لجدول إيصالات الدفع
DROP POLICY IF EXISTS "Admins and managers can manage payment receipts" ON public.payment_receipts;
DROP POLICY IF EXISTS "Authenticated users can view payment receipts" ON public.payment_receipts;

CREATE POLICY "Users can manage payment receipts"
ON public.payment_receipts
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

CREATE POLICY "Users can view payment receipts"
ON public.payment_receipts
FOR SELECT
USING (
  organization_id IS NULL 
  OR organization_id = get_user_organization(auth.uid())
);

-- تحديث سياسات RLS لجدول عمولات السائقين
DROP POLICY IF EXISTS "Admins and managers can manage driver commissions" ON public.company_driver_commissions;
DROP POLICY IF EXISTS "Authenticated users can view driver commissions" ON public.company_driver_commissions;

CREATE POLICY "Users can manage driver commissions"
ON public.company_driver_commissions
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

CREATE POLICY "Users can view driver commissions"
ON public.company_driver_commissions
FOR SELECT
USING (
  organization_id IS NULL 
  OR organization_id = get_user_organization(auth.uid())
);

-- تحديث سياسات RLS لجدول أسعار الشركات
DROP POLICY IF EXISTS "Admins and managers can manage company prices" ON public.company_load_type_prices;
DROP POLICY IF EXISTS "Authenticated users can view company prices" ON public.company_load_type_prices;

CREATE POLICY "Users can manage company prices"
ON public.company_load_type_prices
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

CREATE POLICY "Users can view company prices"
ON public.company_load_type_prices
FOR SELECT
USING (
  organization_id IS NULL 
  OR organization_id = get_user_organization(auth.uid())
);