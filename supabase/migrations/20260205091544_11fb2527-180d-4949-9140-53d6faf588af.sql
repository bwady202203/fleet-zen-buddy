
-- جدول طلبات التحويل الرئيسية
CREATE TABLE public.transfer_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_number SERIAL,
  request_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'posted')),
  total_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  notes TEXT,
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID,
  posted_at TIMESTAMP WITH TIME ZONE,
  posted_by UUID,
  journal_entry_id UUID REFERENCES public.journal_entries(id),
  organization_id UUID REFERENCES public.organizations(id),
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- جدول بنود طلبات التحويل
CREATE TABLE public.transfer_request_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transfer_request_id UUID NOT NULL REFERENCES public.transfer_requests(id) ON DELETE CASCADE,
  serial_number INTEGER NOT NULL,
  description TEXT NOT NULL,
  amount NUMERIC(15,2) NOT NULL,
  account_id UUID REFERENCES public.chart_of_accounts(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- تفعيل RLS
ALTER TABLE public.transfer_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transfer_request_items ENABLE ROW LEVEL SECURITY;

-- سياسات الأمان لطلبات التحويل
CREATE POLICY "Users can view transfer requests" 
ON public.transfer_requests 
FOR SELECT 
USING (true);

CREATE POLICY "Users can create transfer requests" 
ON public.transfer_requests 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can update transfer requests" 
ON public.transfer_requests 
FOR UPDATE 
USING (true);

CREATE POLICY "Users can delete draft transfer requests" 
ON public.transfer_requests 
FOR DELETE 
USING (status = 'draft');

-- سياسات الأمان لبنود طلبات التحويل
CREATE POLICY "Users can view transfer request items" 
ON public.transfer_request_items 
FOR SELECT 
USING (true);

CREATE POLICY "Users can create transfer request items" 
ON public.transfer_request_items 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can update transfer request items" 
ON public.transfer_request_items 
FOR UPDATE 
USING (true);

CREATE POLICY "Users can delete transfer request items" 
ON public.transfer_request_items 
FOR DELETE 
USING (true);

-- فهرس للبحث السريع
CREATE INDEX idx_transfer_requests_status ON public.transfer_requests(status);
CREATE INDEX idx_transfer_requests_date ON public.transfer_requests(request_date);
CREATE INDEX idx_transfer_request_items_request ON public.transfer_request_items(transfer_request_id);
