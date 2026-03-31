BEGIN;
SELECT plan(22);

-- ============================================
-- Test: dsr_requests table exists with RLS
-- ============================================

SELECT has_table('public', 'dsr_requests', 'dsr_requests table exists');

SELECT col_type_is(
  'public', 'dsr_requests', 'request_type', 'text',
  'request_type column is text'
);

SELECT col_type_is(
  'public', 'dsr_requests', 'status', 'text',
  'status column is text'
);

SELECT col_type_is(
  'public', 'dsr_requests', 'due_at', 'timestamp with time zone',
  'due_at column is timestamptz'
);

-- ============================================
-- Test: dsr_requests evidence model columns
-- ============================================

SELECT has_column(
  'public', 'dsr_requests', 'verification_method',
  'dsr_requests has verification_method column'
);

SELECT has_column(
  'public', 'dsr_requests', 'verified_by',
  'dsr_requests has verified_by column'
);

SELECT has_column(
  'public', 'dsr_requests', 'completed_by',
  'dsr_requests has completed_by column'
);

SELECT has_column(
  'public', 'dsr_requests', 'denial_reason',
  'dsr_requests has denial_reason column'
);

SELECT has_column(
  'public', 'dsr_requests', 'extension_reason',
  'dsr_requests has extension_reason column'
);

SELECT has_column(
  'public', 'dsr_requests', 'extended_due_at',
  'dsr_requests has extended_due_at column'
);

-- ============================================
-- Test: profiles.limit_sensitive_pi exists
-- ============================================

SELECT has_column(
  'public', 'profiles', 'limit_sensitive_pi',
  'profiles table has limit_sensitive_pi column'
);

SELECT col_type_is(
  'public', 'profiles', 'limit_sensitive_pi', 'boolean',
  'limit_sensitive_pi is boolean'
);

SELECT col_default_is(
  'public', 'profiles', 'limit_sensitive_pi', 'false',
  'limit_sensitive_pi defaults to false'
);

-- ============================================
-- Test: anonymization function exists
-- ============================================

SELECT has_function(
  'public', 'anonymize_audit_log_for_user', ARRAY['text'],
  'anonymize_audit_log_for_user(text) function exists'
);

-- ============================================
-- Test: dsr_request_events table exists with immutability
-- ============================================

SELECT has_table('public', 'dsr_request_events', 'dsr_request_events table exists');

SELECT col_type_is(
  'public', 'dsr_request_events', 'event_type', 'text',
  'event_type column is text'
);

SELECT col_type_is(
  'public', 'dsr_request_events', 'summary', 'text',
  'summary column is text'
);

SELECT col_type_is(
  'public', 'dsr_request_events', 'details', 'jsonb',
  'details column is jsonb'
);

SELECT has_trigger(
  'public', 'dsr_request_events', 'trg_prevent_dsr_event_update',
  'dsr_request_events has update prevention trigger'
);

SELECT has_trigger(
  'public', 'dsr_request_events', 'trg_prevent_dsr_event_delete',
  'dsr_request_events has delete prevention trigger'
);

-- ============================================
-- Test: fulfillment function exists
-- ============================================

SELECT has_function(
  'public', 'fulfill_dsr_deletion', ARRAY['uuid', 'uuid'],
  'fulfill_dsr_deletion(uuid, uuid) function exists'
);

-- ============================================
-- Test: intake auto-logging trigger
-- ============================================

SELECT has_trigger(
  'public', 'dsr_requests', 'trg_log_dsr_intake',
  'dsr_requests has intake auto-logging trigger'
);

SELECT * FROM finish();
ROLLBACK;
