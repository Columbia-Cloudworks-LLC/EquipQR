CREATE INDEX IF NOT EXISTS idx_dsr_requests_organization_id ON public.dsr_requests USING btree (organization_id);
