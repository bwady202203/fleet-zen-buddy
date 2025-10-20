-- إضافة عمود لتخزين تاريخ آخر دخول للشركة
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS last_accessed_at timestamp with time zone;

-- إضافة فهرس لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_organizations_last_accessed 
ON public.organizations(last_accessed_at DESC);