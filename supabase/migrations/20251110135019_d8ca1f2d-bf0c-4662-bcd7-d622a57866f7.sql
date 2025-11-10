-- إنشاء جدول فواتير مشتريات الصيانة
CREATE TABLE IF NOT EXISTS public.maintenance_purchase_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT NOT NULL UNIQUE,
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  supplier_name TEXT NOT NULL,
  credit_account_id UUID REFERENCES public.chart_of_accounts(id),
  subtotal NUMERIC NOT NULL DEFAULT 0,
  tax_rate NUMERIC NOT NULL DEFAULT 15,
  tax_amount NUMERIC NOT NULL DEFAULT 0,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  journal_entry_id UUID REFERENCES public.journal_entries(id),
  organization_id UUID REFERENCES public.organizations(id),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- إنشاء جدول عناصر فواتير المشتريات
CREATE TABLE IF NOT EXISTS public.maintenance_purchase_invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.maintenance_purchase_invoices(id) ON DELETE CASCADE,
  spare_part_id UUID REFERENCES public.spare_parts(id),
  item_name TEXT NOT NULL,
  quantity NUMERIC NOT NULL,
  unit_price NUMERIC NOT NULL,
  total_price NUMERIC NOT NULL,
  organization_id UUID REFERENCES public.organizations(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- تفعيل RLS على الجداول الجديدة
ALTER TABLE public.maintenance_purchase_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_purchase_invoice_items ENABLE ROW LEVEL SECURITY;

-- سياسات RLS لفواتير مشتريات الصيانة
CREATE POLICY "Users can manage maintenance purchase invoices"
ON public.maintenance_purchase_invoices
FOR ALL
USING (
  organization_id IS NULL OR 
  organization_id = get_user_organization(auth.uid()) OR 
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role)
)
WITH CHECK (
  organization_id IS NULL OR 
  organization_id = get_user_organization(auth.uid())
);

CREATE POLICY "Users can view maintenance purchase invoices"
ON public.maintenance_purchase_invoices
FOR SELECT
USING (
  organization_id IS NULL OR 
  organization_id = get_user_organization(auth.uid())
);

-- سياسات RLS لعناصر فواتير المشتريات
CREATE POLICY "Users can manage maintenance purchase invoice items"
ON public.maintenance_purchase_invoice_items
FOR ALL
USING (
  organization_id IS NULL OR 
  organization_id = get_user_organization(auth.uid()) OR 
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role)
)
WITH CHECK (
  organization_id IS NULL OR 
  organization_id = get_user_organization(auth.uid())
);

CREATE POLICY "Users can view maintenance purchase invoice items"
ON public.maintenance_purchase_invoice_items
FOR SELECT
USING (
  organization_id IS NULL OR 
  organization_id = get_user_organization(auth.uid())
);

-- إضافة trigger لتحديث updated_at
CREATE TRIGGER update_maintenance_purchase_invoices_updated_at
BEFORE UPDATE ON public.maintenance_purchase_invoices
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_maintenance_purchase_invoice_items_updated_at
BEFORE UPDATE ON public.maintenance_purchase_invoice_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- إنشاء فهارس لتحسين الأداء
CREATE INDEX idx_maintenance_purchase_invoices_org ON public.maintenance_purchase_invoices(organization_id);
CREATE INDEX idx_maintenance_purchase_invoices_date ON public.maintenance_purchase_invoices(invoice_date);
CREATE INDEX idx_maintenance_purchase_invoice_items_invoice ON public.maintenance_purchase_invoice_items(invoice_id);
CREATE INDEX idx_maintenance_purchase_invoice_items_spare_part ON public.maintenance_purchase_invoice_items(spare_part_id);