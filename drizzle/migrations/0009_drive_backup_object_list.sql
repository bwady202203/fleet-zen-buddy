CREATE OR REPLACE FUNCTION public.list_backup_storage_objects(_offset int, _limit int)
RETURNS TABLE(bucket_id text, name text, size bigint, mimetype text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, storage AS $$
  SELECT o.bucket_id, o.name, (o.metadata->>'size')::bigint, o.metadata->>'mimetype'
  FROM storage.objects o
  WHERE o.bucket_id IN ('document-archive','journal-documents','crusher-invoices')
  ORDER BY o.created_at, o.id OFFSET _offset LIMIT _limit
$$;
REVOKE ALL ON FUNCTION public.list_backup_storage_objects(int,int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.list_backup_storage_objects(int,int) TO service_role;