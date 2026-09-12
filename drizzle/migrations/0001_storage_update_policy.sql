CREATE POLICY "sahayak storage update" ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = ANY (ARRAY['intelligence-sources','video-derived','analysis-artifacts'])
  AND public.can_access_investigation(((storage.foldername(name))[1])::uuid)
)
WITH CHECK (
  bucket_id = ANY (ARRAY['intelligence-sources','video-derived','analysis-artifacts'])
  AND public.can_access_investigation(((storage.foldername(name))[1])::uuid)
);