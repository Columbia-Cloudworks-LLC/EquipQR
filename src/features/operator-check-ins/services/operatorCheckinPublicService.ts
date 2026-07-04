import { supabase } from '@/integrations/supabase/client';
import type {
  CapturedFieldValue,
  OperatorChecklistAnswer,
  OperatorChecklistDataField,
  OperatorChecklistTemplateItem,
} from '@/features/operator-check-ins/types/operatorChecklist';

export interface OperatorCheckinLoadResponse {
  template: {
    id: string;
    name: string;
    description: string | null;
    checklistItems: OperatorChecklistTemplateItem[];
    dataFields: OperatorChecklistDataField[];
  };
  equipmentPreviewFields: CapturedFieldValue[];
  locationCollectionEnabled: boolean;
  captchaRequired: boolean;
  complianceNotice: string;
}

function getInvokeErrorMessage(data: unknown, fallback: string): string {
  if (data && typeof data === 'object' && 'error' in data) {
    const message = (data as { error?: unknown }).error;
    if (typeof message === 'string' && message.trim()) return message;
  }
  return fallback;
}

export async function loadOperatorCheckinForm(token: string): Promise<OperatorCheckinLoadResponse> {
  const { data, error } = await supabase.functions.invoke('operator-check-in', {
    body: { action: 'load', token },
  });

  if (error) {
    throw new Error(getInvokeErrorMessage(data, error.message || 'Check-in is not available'));
  }
  if (!data?.template) {
    throw new Error(getInvokeErrorMessage(data, 'Check-in is not available'));
  }
  return data as OperatorCheckinLoadResponse;
}

export async function submitOperatorCheckin(input: {
  token: string;
  operatorFieldValues: Record<string, unknown>;
  checklistAnswers: OperatorChecklistAnswer[];
  clientTimezone?: string;
  latitude?: number | null;
  longitude?: number | null;
  location?: string | null;
  captchaToken?: string;
}): Promise<{ submissionId: string; submittedAt: string }> {
  const { data, error } = await supabase.functions.invoke('operator-check-in', {
    body: {
      action: 'submit',
      ...input,
      requestFingerprint: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 128) : null,
    },
  });

  if (error) {
    throw new Error(getInvokeErrorMessage(data, error.message || 'Unable to submit check-in'));
  }
  if (!data?.success) {
    throw new Error(getInvokeErrorMessage(data, 'Submission failed'));
  }
  return { submissionId: data.submissionId, submittedAt: data.submittedAt };
}
