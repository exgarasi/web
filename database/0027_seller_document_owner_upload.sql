-- Permit authenticated store owners to attach/replace their own pending verification document.
GRANT UPDATE (document_object_key) ON public.seller_verifications TO exgarasi_app;
DROP POLICY IF EXISTS verifications_owner_document_update ON public.seller_verifications;
CREATE POLICY verifications_owner_document_update ON public.seller_verifications
FOR UPDATE USING (status='pending' AND public.app_is_store_member(store_id))
WITH CHECK (status='pending' AND public.app_is_store_member(store_id));
