CREATE TABLE public.archived_documents (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid,
  title text NOT NULL,
  description text,
  doc_date date,
  party_name text,
  reference_number text,
  amount numeric,
  file_path text NOT NULL,
  file_name text,
  file_type text,
  file_size bigint,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.archived_documents TO authenticated;
GRANT ALL ON public.archived_documents TO service_role;

ALTER TABLE public.archived_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "archived_documents_select" ON public.archived_documents
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "archived_documents_insert" ON public.archived_documents
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "archived_documents_update" ON public.archived_documents
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "archived_documents_delete" ON public.archived_documents
  FOR DELETE TO authenticated USING (true);

CREATE TRIGGER update_archived_documents_updated_at
  BEFORE UPDATE ON public.archived_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX archived_documents_created_at_idx ON public.archived_documents (created_at DESC);

CREATE POLICY "archive_docs_read" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'document-archive');
CREATE POLICY "archive_docs_insert" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'document-archive');
CREATE POLICY "archive_docs_update" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'document-archive');
CREATE POLICY "archive_docs_delete" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'document-archive');