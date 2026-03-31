import { supabase } from '@/integrations/supabase/client';

export type DsrStatus = 'received' | 'verifying' | 'processing' | 'completed' | 'denied';
export type DsrSlaBucket = 'overdue' | 'due_soon' | 'on_track';

export interface DsrRequest {
  id: string;
  status: DsrStatus;
  request_type: string;
  requester_email: string;
  requester_name: string;
  organization_id: string | null;
  due_at: string;
  extended_due_at: string | null;
  received_at: string;
  updated_at: string;
  checklist_progress: Record<string, unknown> | null;
  required_checklist_steps: string[] | null;
  export_artifacts: Record<string, unknown> | null;
  sla_bucket?: DsrSlaBucket;
}

export interface DsrRequestEvent {
  id: string;
  dsr_request_id: string;
  event_type: string;
  actor_id: string | null;
  actor_email: string | null;
  summary: string;
  details: Record<string, unknown>;
  created_at: string;
}

interface FunctionErrorPayload {
  error?: string;
}

async function invokeManageDsr(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke('manage-dsr-request', { body });

  if (error) {
    throw new Error(error.message || 'Failed to invoke manage-dsr-request');
  }

  if (data && typeof data === 'object' && 'error' in data) {
    const payload = data as FunctionErrorPayload;
    throw new Error(payload.error || 'DSR function returned an error');
  }

  return data as Record<string, unknown>;
}

export async function fetchDsrQueue(organizationId: string): Promise<DsrRequest[]> {
  const data = await invokeManageDsr({
    action: 'list_queue',
    organizationId,
  });

  return (data.requests ?? []) as DsrRequest[];
}

export async function fetchDsrCase(organizationId: string, dsrRequestId: string): Promise<{ request: DsrRequest; events: DsrRequestEvent[] }> {
  const data = await invokeManageDsr({
    action: 'get_case',
    organizationId,
    dsrRequestId,
  });

  return {
    request: data.request as DsrRequest,
    events: (data.events ?? []) as DsrRequestEvent[],
  };
}

export async function mutateDsrRequest(
  organizationId: string,
  dsrRequestId: string,
  action:
    | 'verify'
    | 'deny'
    | 'extend'
    | 'record_fulfillment_step'
    | 'fulfill_deletion'
    | 'complete'
    | 'add_note'
    | 'request_export'
    | 'retry_export'
    | 'resend_notice',
  expectedUpdatedAt: string,
  payload: Record<string, unknown> = {},
): Promise<DsrRequest> {
  const data = await invokeManageDsr({
    organizationId,
    dsrRequestId,
    action,
    expected_updated_at: expectedUpdatedAt,
    ...payload,
  });

  return data.request as DsrRequest;
}
