DROP POLICY IF EXISTS "inv select" ON public.investigations;

CREATE POLICY "inv select" ON public.investigations
FOR SELECT TO authenticated
USING (
  created_by = auth.uid()
  OR public.has_role(auth.uid(), 'admin')
  OR EXISTS (
    SELECT 1 FROM public.investigation_members m
    WHERE m.investigation_id = investigations.id AND m.user_id = auth.uid()
  )
);