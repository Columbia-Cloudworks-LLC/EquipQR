-- Migration: add_dsr_requests_organization_id_index
-- Purpose: Restore FK coverage for dsr_requests.organization_id after
--          dropping the composite partial idx_dsr_requests_org_status_due
--          which was the only index with organization_id as leftmost column.

CREATE INDEX IF NOT EXISTS idx_dsr_requests_organization_id
  ON public.dsr_requests USING btree (organization_id);
