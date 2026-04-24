BEGIN;

DROP INDEX IF EXISTS public.idx_dsr_requests_org_status_due;
DROP INDEX IF EXISTS public.idx_dsr_requests_status;
DROP INDEX IF EXISTS public.idx_dsr_requests_email;
DROP INDEX IF EXISTS public.idx_dsr_requests_due;
DROP INDEX IF EXISTS public.idx_dsr_request_events_type;

DROP INDEX IF EXISTS public.idx_workspace_merge_pending;
DROP INDEX IF EXISTS public.organization_member_claims_email;
DROP INDEX IF EXISTS public.idx_organization_members_can_manage_qb;

DROP INDEX IF EXISTS public.idx_export_log_status;
DROP INDEX IF EXISTS public.idx_departure_queue_pending;
DROP INDEX IF EXISTS public.idx_notifications_is_global;

DROP INDEX IF EXISTS public.idx_audit_log_entity;

DROP INDEX IF EXISTS public.idx_inventory_items_external_id;
DROP INDEX IF EXISTS public.idx_inventory_items_low_stock;
DROP INDEX IF EXISTS public.idx_inventory_items_sku;
DROP INDEX IF EXISTS public.idx_inventory_transactions_created_at;

DROP INDEX IF EXISTS public.idx_equip_loc_history_source;

DROP INDEX IF EXISTS public.idx_quickbooks_credentials_token_expiry;
DROP INDEX IF EXISTS public.idx_quickbooks_credentials_refresh_needed;
DROP INDEX IF EXISTS public.idx_quickbooks_export_logs_intuit_tid;
DROP INDEX IF EXISTS public.idx_quickbooks_export_logs_invoice_number;
DROP INDEX IF EXISTS public.idx_quickbooks_export_logs_realm;
DROP INDEX IF EXISTS public.idx_quickbooks_export_logs_status;
DROP INDEX IF EXISTS public.idx_quickbooks_oauth_sessions_expires;
DROP INDEX IF EXISTS public.idx_quickbooks_oauth_sessions_token;
DROP INDEX IF EXISTS public.idx_quickbooks_team_customers_qb_customer;

DROP INDEX IF EXISTS public.idx_tickets_created_at;
DROP INDEX IF EXISTS public.idx_tickets_updated_at;
DROP INDEX IF EXISTS public.idx_ticket_comments_created_at;

DROP INDEX IF EXISTS public.idx_work_orders_created_date;
DROP INDEX IF EXISTS public.idx_work_order_equipment_primary;
DROP INDEX IF EXISTS public.idx_work_order_equipment_wo;

DROP INDEX IF EXISTS public.idx_pm_template_compat_rules_mfr_any_model;
DROP INDEX IF EXISTS public.idx_part_compat_rules_mfr_any_model;
DROP INDEX IF EXISTS public.idx_part_compat_rules_pattern_norm;

COMMIT;
