-- تفعيل التحديث الفوري لجدول القيود اليومية
ALTER PUBLICATION supabase_realtime ADD TABLE public.journal_entries;
ALTER PUBLICATION supabase_realtime ADD TABLE public.journal_entry_lines;