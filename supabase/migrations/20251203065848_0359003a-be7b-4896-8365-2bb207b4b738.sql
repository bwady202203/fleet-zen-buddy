-- جدول تقارير سجل الشحنات المطور
CREATE TABLE public.advanced_loads_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_name TEXT NOT NULL,
  report_date DATE NOT NULL DEFAULT CURRENT_DATE,
  
  -- معايير الفلتر المستخدمة
  filter_company_id UUID REFERENCES public.companies(id),
  filter_load_type_id UUID REFERENCES public.load_types(id),
  filter_driver_id UUID REFERENCES public.drivers(id),
  filter_start_date DATE,
  filter_end_date DATE,
  filter_search_text TEXT,
  
  -- إحصائيات التقرير
  total_loads INTEGER NOT NULL DEFAULT 0,
  total_quantity NUMERIC NOT NULL DEFAULT 0,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  total_commission NUMERIC NOT NULL DEFAULT 0,
  unique_drivers INTEGER NOT NULL DEFAULT 0,
  unique_companies INTEGER NOT NULL DEFAULT 0,
  
  -- بيانات الشحنات (JSON للحفظ الكامل)
  loads_data JSONB,
  
  -- معلومات إضافية
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  organization_id UUID REFERENCES public.organizations(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- تفعيل RLS
ALTER TABLE public.advanced_loads_reports ENABLE ROW LEVEL SECURITY;

-- سياسات الأمان
CREATE POLICY "Users can view their organization reports"
ON public.advanced_loads_reports
FOR SELECT
USING (
  (organization_id IS NULL) OR 
  (organization_id = get_user_organization(auth.uid()))
);

CREATE POLICY "Users can manage their organization reports"
ON public.advanced_loads_reports
FOR ALL
USING (
  (organization_id IS NULL) OR 
  (organization_id = get_user_organization(auth.uid())) OR 
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role)
)
WITH CHECK (
  (organization_id IS NULL) OR 
  (organization_id = get_user_organization(auth.uid()))
);

-- فهرس للبحث السريع
CREATE INDEX idx_advanced_loads_reports_date ON public.advanced_loads_reports(report_date DESC);
CREATE INDEX idx_advanced_loads_reports_org ON public.advanced_loads_reports(organization_id);

-- Trigger لتحديث updated_at
CREATE TRIGGER update_advanced_loads_reports_updated_at
  BEFORE UPDATE ON public.advanced_loads_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- إضافة تعليقات توضيحية
COMMENT ON TABLE public.advanced_loads_reports IS 'جدول لحفظ تقارير سجل الشحنات المطور مع الفلاتر والإحصائيات';
COMMENT ON COLUMN public.advanced_loads_reports.loads_data IS 'بيانات الشحنات المفلترة بصيغة JSON';