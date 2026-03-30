BEGIN;
SELECT plan(12);

SELECT has_column(
  'public', 'dsr_requests', 'organization_id',
  'dsr_requests has organization_id column'
);

SELECT has_column(
  'public', 'dsr_requests', 'checklist_progress',
  'dsr_requests has checklist_progress column'
);

SELECT has_column(
  'public', 'dsr_requests', 'required_checklist_steps',
  'dsr_requests has required_checklist_steps column'
);

SELECT has_column(
  'public', 'dsr_requests', 'export_artifacts',
  'dsr_requests has export_artifacts column'
);

SELECT col_type_is(
  'public', 'dsr_requests', 'export_artifacts', 'jsonb',
  'export_artifacts is jsonb'
);

SELECT has_index(
  'public',
  'dsr_requests',
  'idx_dsr_requests_org_status_due',
  'queue index exists for organization + status + due date'
);

SELECT policy_cmd_is(
  'public',
  'dsr_requests',
  'org_admins_manage_dsr_requests',
  'SELECT',
  'org_admins_manage_dsr_requests is a SELECT policy'
);

SELECT policy_cmd_is(
  'public',
  'dsr_request_events',
  'org_admins_manage_dsr_events',
  'SELECT',
  'org_admins_manage_dsr_events is a SELECT policy'
);

SELECT has_function(
  'public',
  'fulfill_dsr_deletion',
  ARRAY['uuid', 'uuid'],
  'fulfill_dsr_deletion function still exists after cockpit migration'
);

SELECT ok(
  EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'dsr_request_events_event_type_check'
  ),
  'event type check constraint exists'
);

SELECT has_trigger(
  'public', 'dsr_request_events', 'trg_prevent_dsr_event_update',
  'append-only trigger remains in place'
);

SELECT has_trigger(
  'public', 'dsr_request_events', 'trg_prevent_dsr_event_delete',
  'append-only delete trigger remains in place'
);

SELECT * FROM finish();
ROLLBACK;
