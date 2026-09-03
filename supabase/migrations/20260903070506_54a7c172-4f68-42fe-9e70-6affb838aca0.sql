CREATE POLICY "Authenticated can read journal documents files"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'journal-documents');

CREATE POLICY "Authenticated can upload journal documents files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'journal-documents');

CREATE POLICY "Authenticated can update journal documents files"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'journal-documents');

CREATE POLICY "Authenticated can delete journal documents files"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'journal-documents');