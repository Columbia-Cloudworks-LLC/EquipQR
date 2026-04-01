-- Migration: drop_unused_non_fk_indexes
-- Purpose: Drop all unused indexes that are NOT the sole covering index for a
--          foreign key constraint. Every index listed below has 0 scans in
--          pg_stat_user_indexes since database creation (stats never reset).
--
-- Classification method:
--   1. Queried pg_constraint + pg_index to identify which unused indexes are
--      the only btree covering a FK column as leftmost key.
--   2. Verified no application code references these indexes by name.
--   3. Partial indexes cannot serve as FK coverage (excluded subset of rows).
--
-- Indexes intentionally RETAINED (FK-covering, documented in comments below):
--   56 single-column FK-covering indexes + 1 composite FK-covering index
--   (idx_dsr_request_events_request). These remain as unused_index advisor
--   findings but are structurally required to prevent unindexed_foreign_keys.
--
-- Total dropped: 35 indexes

BEGIN;

-- =============================================================================
-- DSR / Compliance (5 indexes)
-- =============================================================================

DROP INDEX IF EXISTS public.idx_dsr_requests_org_status_due;
DROP INDEX IF EXISTS public.idx_dsr_requests_status;
DROP INDEX IF EXISTS public.idx_dsr_requests_email;
DROP INDEX IF EXISTS public.idx_dsr_requests_due;
DROP INDEX IF EXISTS public.idx_dsr_request_events_type;

-- KEEP: idx_dsr_request_events_request (dsr_request_id, created_at)
--       Only btree covering dsr_request_events.dsr_request_id FK.

-- =============================================================================
-- Workspace / Org onboarding (3 indexes)
-- =============================================================================

DROP INDEX IF EXISTS public.idx_workspace_merge_pending;
DROP INDEX IF EXISTS public.organization_member_claims_email;
DROP INDEX IF EXISTS public.idx_organization_members_can_manage_qb;

-- =============================================================================
-- Export / departure / notifications (3 indexes)
-- =============================================================================

DROP INDEX IF EXISTS public.idx_export_log_status;
DROP INDEX IF EXISTS public.idx_departure_queue_pending;
DROP INDEX IF EXISTS public.idx_notifications_is_global;

-- =============================================================================
-- Audit log (1 index)
-- =============================================================================

DROP INDEX IF EXISTS public.idx_audit_log_entity;

-- =============================================================================
-- Inventory (4 indexes)
-- =============================================================================

DROP INDEX IF EXISTS public.idx_inventory_items_external_id;
DROP INDEX IF EXISTS public.idx_inventory_items_low_stock;
DROP INDEX IF EXISTS public.idx_inventory_items_sku;
DROP INDEX IF EXISTS public.idx_inventory_transactions_created_at;

-- =============================================================================
-- Equipment location history (1 index)
-- =============================================================================

DROP INDEX IF EXISTS public.idx_equip_loc_history_source;

-- =============================================================================
-- QuickBooks (8 indexes)
-- =============================================================================

DROP INDEX IF EXISTS public.idx_quickbooks_credentials_token_expiry;
DROP INDEX IF EXISTS public.idx_quickbooks_credentials_refresh_needed;
DROP INDEX IF EXISTS public.idx_quickbooks_export_logs_intuit_tid;
DROP INDEX IF EXISTS public.idx_quickbooks_export_logs_invoice_number;
DROP INDEX IF EXISTS public.idx_quickbooks_export_logs_realm;
DROP INDEX IF EXISTS public.idx_quickbooks_export_logs_status;
DROP INDEX IF EXISTS public.idx_quickbooks_oauth_sessions_expires;
DROP INDEX IF EXISTS public.idx_quickbooks_oauth_sessions_token;
DROP INDEX IF EXISTS public.idx_quickbooks_team_customers_qb_customer;

-- =============================================================================
-- Tickets (3 indexes)
-- =============================================================================

DROP INDEX IF EXISTS public.idx_tickets_created_at;
DROP INDEX IF EXISTS public.idx_tickets_updated_at;
DROP INDEX IF EXISTS public.idx_ticket_comments_created_at;

-- =============================================================================
-- Work orders (3 indexes)
-- =============================================================================

DROP INDEX IF EXISTS public.idx_work_orders_created_date;
DROP INDEX IF EXISTS public.idx_work_order_equipment_primary;
-- idx_work_order_equipment_wo is redundant with unique index
-- work_order_equipment_work_order_id_equipment_id_key (work_order_id is leftmost)
DROP INDEX IF EXISTS public.idx_work_order_equipment_wo;

-- =============================================================================
-- Parts / PM compatibility (3 indexes)
-- =============================================================================

DROP INDEX IF EXISTS public.idx_pm_template_compat_rules_mfr_any_model;
DROP INDEX IF EXISTS public.idx_part_compat_rules_mfr_any_model;
DROP INDEX IF EXISTS public.idx_part_compat_rules_pattern_norm;

COMMIT;
