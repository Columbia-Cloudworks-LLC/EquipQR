import { useMemo } from 'react';
import { toast } from 'sonner';
import type { DsrRequest, DsrRequestEvent } from '@/features/dsr/api/dsrApi';
import { DsrChecklistPanel } from '@/features/dsr/components/DsrChecklistPanel';
import { DsrEvidencePanel } from '@/features/dsr/components/DsrEvidencePanel';
import { DsrLifecycleActions } from '@/features/dsr/components/DsrLifecycleActions';

interface DsrCaseWorkspaceProps {
  request: DsrRequest;
  events: DsrRequestEvent[];
  pending: boolean;
  onMutate: (
    action:
      | 'verify'
      | 'deny'
      | 'extend'
      | 'start_processing'
      | 'record_fulfillment_step'
      | 'fulfill_deletion'
      | 'complete'
      | 'add_note'
      | 'request_export'
      | 'retry_export'
      | 'resend_notice',
    payload?: Record<string, unknown>,
  ) => Promise<void>;
}

export function DsrCaseWorkspace({ request, events, pending, onMutate }: DsrCaseWorkspaceProps) {
  const timeline = useMemo(
    () => [...events].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [events],
  );

  const runMutation = async (
    action:
      | 'verify'
      | 'deny'
      | 'extend'
      | 'start_processing'
      | 'record_fulfillment_step'
      | 'fulfill_deletion'
      | 'complete'
      | 'add_note'
      | 'request_export'
      | 'retry_export'
      | 'resend_notice',
    payload?: Record<string, unknown>,
  ) => {
    try {
      await onMutate(action, payload);
      toast.success(`Action applied: ${action}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Action failed';
      toast.error(message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-md border p-3">
        <h2 className="text-lg font-semibold">Case Details</h2>
        <p className="text-sm text-muted-foreground mt-1">Requester: {request.requester_email}</p>
        <p className="text-sm text-muted-foreground">Type: {request.request_type}</p>
        <p className="text-sm text-muted-foreground">Status: {request.status}</p>
      </div>

      <DsrLifecycleActions
        isProcessing={request.status === 'processing'}
        onStartProcessing={() => runMutation('start_processing')}
        onComplete={() => runMutation('complete')}
        onDeny={(reason) => runMutation('deny', { reason })}
        onExtend={(reason) => runMutation('extend', { reason })}
      />

      <DsrChecklistPanel request={request} />

      <DsrEvidencePanel
        exportArtifacts={request.export_artifacts}
        onGenerate={() => runMutation('request_export')}
        onRetry={() => runMutation('retry_export')}
        disabled={pending}
      />

      <div className="rounded-md border p-3">
        <h3 className="text-sm font-medium mb-2">Timeline</h3>
        <div className="space-y-2">
          {timeline.length === 0 ? <p className="text-sm text-muted-foreground">No events yet.</p> : null}
          {timeline.map((event) => (
            <div key={event.id} className="rounded-sm border p-2">
              <p className="text-sm font-medium">{event.summary}</p>
              <p className="text-xs text-muted-foreground">
                {event.event_type} • {new Date(event.created_at).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
