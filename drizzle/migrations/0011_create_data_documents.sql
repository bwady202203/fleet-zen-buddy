CREATE TABLE public.data_documents (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 organization_id uuid NOT NULL REFERENCES public.organizations(id),
 title text NOT NULL,
 file_name text NOT NULL,
 file_path text NOT NULL UNIQUE,
 mime_type text NOT NULL,
 file_size bigint NOT NULL DEFAULT 0,
 created_by uuid DEFAULT auth.uid(),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.data_documents TO authenticated;
GRANT ALL ON public.data_documents TO service_role;
ALTER TABLE public.data_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org admins manage data documents" ON public.data_documents FOR ALL TO authenticated USING (public.user_in_org(auth.uid(), organization_id) AND public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.user_in_org(auth.uid(), organization_id) AND public.has_role(auth.uid(), 'admin'::public.app_role) AND split_part(file_path, '/', 1) = organization_id::text);
CREATE INDEX data_documents_org_created_idx ON public.data_documents(organization_id, created_at DESC);
CREATE TRIGGER data_documents_updated_at BEFORE UPDATE ON public.data_documents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE POLICY "org admins manage data document files" ON storage.objects FOR ALL TO authenticated USING (bucket_id = 'data-documents' AND public.has_role(auth.uid(), 'admin'::public.app_role) AND (storage.foldername(name))[1] IN (SELECT public.get_user_organizations(auth.uid())::text)) WITH CHECK (bucket_id = 'data-documents' AND public.has_role(auth.uid(), 'admin'::public.app_role) AND (storage.foldername(name))[1] IN (SELECT public.get_user_organizations(auth.uid())::text));