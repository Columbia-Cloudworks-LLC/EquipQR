BEGIN;
SELECT plan(17);

-- ============================================
-- Account deletion RPC existence
-- ============================================

SELECT has_function(
  'public',
  'preview_account_deletion',
  ARRAY['uuid'],
  'preview_account_deletion function exists'
);

SELECT has_function(
  'public',
  'prepare_account_deletion',
  ARRAY['uuid', 'uuid', 'uuid'],
  'prepare_account_deletion function exists'
);

SELECT function_returns(
  'public',
  'preview_account_deletion',
  ARRAY['uuid'],
  'jsonb',
  'preview_account_deletion returns jsonb'
);

-- ============================================
-- SECURITY DEFINER posture
-- ============================================

SELECT ok(
  (
    SELECT prosecdef
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'preview_account_deletion'
      AND pg_get_function_identity_arguments(p.oid) = 'p_user_id uuid'
  ),
  'preview_account_deletion is SECURITY DEFINER'
);

SELECT ok(
  (
    SELECT prosecdef
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'prepare_account_deletion'
      AND pg_get_function_identity_arguments(p.oid) = 'p_user_id uuid, p_dsr_request_id uuid, p_actor_id uuid'
  ),
  'prepare_account_deletion is SECURITY DEFINER'
);

-- ============================================
-- Profile tombstone columns
-- ============================================

SELECT has_column(
  'public', 'profiles', 'deleted_at',
  'profiles has deleted_at tombstone column'
);

SELECT has_column(
  'public', 'profiles', 'deleted_reason',
  'profiles has deleted_reason column'
);

SELECT has_column(
  'public', 'pm_status_history', 'changed_by_name',
  'pm_status_history has changed_by_name attribution column'
);

SELECT has_column(
  'public', 'equipment_status_history', 'changed_by_name',
  'equipment_status_history has changed_by_name attribution column'
);

SELECT has_column(
  'public', 'equipment_location_history', 'changed_by_name',
  'equipment_location_history has changed_by_name attribution column'
);

-- ============================================
-- fulfill_dsr_deletion no longer references export_logs
-- ============================================

SELECT ok(
  position('export_logs' IN pg_get_functiondef(p.oid)) = 0,
  'fulfill_dsr_deletion function body does not reference export_logs'
)
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname = 'fulfill_dsr_deletion'
  AND pg_get_function_identity_arguments(p.oid) = 'p_dsr_request_id uuid, p_admin_user_id uuid';

SELECT ok(
  position('export_request_log' IN pg_get_functiondef(p.oid)) > 0,
  'fulfill_dsr_deletion references export_request_log'
)
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname = 'fulfill_dsr_deletion'
  AND pg_get_function_identity_arguments(p.oid) = 'p_dsr_request_id uuid, p_admin_user_id uuid';

SELECT ok(
  position('prepare_account_deletion' IN pg_get_functiondef(p.oid)) > 0,
  'fulfill_dsr_deletion delegates to prepare_account_deletion'
)
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname = 'fulfill_dsr_deletion'
  AND pg_get_function_identity_arguments(p.oid) = 'p_dsr_request_id uuid, p_admin_user_id uuid';

-- ============================================
-- Inventory FK uses SET NULL (Auth deletion safety)
-- ============================================

SELECT ok(
  EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class rel ON rel.oid = c.conrelid
    JOIN pg_namespace ns ON ns.oid = rel.relnamespace
    WHERE ns.nspname = 'public'
      AND rel.relname = 'inventory_items'
      AND c.conname = 'inventory_items_created_by_fkey'
      AND c.confdeltype = 'n'
  ),
  'inventory_items.created_by FK uses ON DELETE SET NULL'
);

-- ============================================
-- dsr_request_events remains append-only
-- ============================================

SELECT has_trigger(
  'public', 'dsr_request_events', 'trg_prevent_dsr_event_update',
  'append-only update trigger remains on dsr_request_events'
);

SELECT has_trigger(
  'public', 'dsr_request_events', 'trg_prevent_dsr_event_delete',
  'append-only delete trigger remains on dsr_request_events'
);

-- ============================================
-- preview_account_deletion is read-only (no DML in function body)
-- ============================================

SELECT ok(
  position('DELETE FROM' IN upper(pg_get_functiondef(p.oid))) = 0
  AND position('UPDATE ' IN upper(pg_get_functiondef(p.oid))) = 0
  AND position('INSERT INTO' IN upper(pg_get_functiondef(p.oid))) = 0,
  'preview_account_deletion contains no DML statements'
)
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname = 'preview_account_deletion'
  AND pg_get_function_identity_arguments(p.oid) = 'p_user_id uuid';

SELECT * FROM finish();
ROLLBACK;
