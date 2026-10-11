import { supabase } from '@/integrations/supabase/client';

export const DELETE_ACCOUNT_CONFIRMATION_PHRASE = 'DELETE MY ACCOUNT';

export type AccountDeletionBlocker = {
  code: string;
  message: string;
  details?: Record<string, unknown>;
};

export type AccountDeletionPreview = {
  eligible_for_self_service: boolean;
  blockers: AccountDeletionBlocker[];
  personal_data: Record<string, unknown>;
  organization_data: Record<string, unknown>;
  storage_actions: Record<string, unknown>[];
  auth_fk_blockers: Record<string, unknown>[];
  warnings: Record<string, unknown>[];
  requester_email?: string | null;
  requester_name?: string | null;
};

export type AccountDeletionDryRunResponse = {
  success: boolean;
  dryRunOnly: boolean;
  preview: AccountDeletionPreview;
};

export type AccountDeletionExecuteResponse = {
  success: boolean;
  deleted?: boolean;
  blocked?: boolean;
  dsrRequestId?: string | null;
  message?: string;
  preview?: AccountDeletionPreview;
  receiptWarning?: string | null;
};

async function invokeDeleteAccount<T>(
  body: Record<string, unknown>,
  options?: { allowStatuses?: number[] },
): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T>('delete-account', { body });

  if (error) {
    let errorBody: (T & { error?: string; message?: string }) | null = null;
    let status: number | undefined;

    const context = (error as { context?: Response })?.context;
    if (context && typeof context.json === 'function') {
      status = context.status;
      try {
        errorBody = await context.json();
      } catch {
        // ignore parse error
      }
    }

    if (status && options?.allowStatuses?.includes(status) && errorBody) {
      return errorBody;
    }

    const message =
      (typeof errorBody?.error === 'string' && errorBody.error) ||
      (typeof errorBody?.message === 'string' && errorBody.message) ||
      error.message ||
      'Account deletion request failed.';
    throw new Error(message);
  }

  if (!data) {
    throw new Error('Account deletion request failed.');
  }

  return data;
}

export async function previewAccountDeletion(): Promise<AccountDeletionPreview> {
  const response = await invokeDeleteAccount<AccountDeletionDryRunResponse>({ dryRunOnly: true });
  return response.preview;
}

export async function executeAccountDeletion(input: {
  confirmationText: string;
  expectedUserEmail: string;
}): Promise<AccountDeletionExecuteResponse> {
  return invokeDeleteAccount<AccountDeletionExecuteResponse>(
    {
      confirmationText: input.confirmationText,
      expectedUserEmail: input.expectedUserEmail,
      dryRunOnly: false,
    },
    { allowStatuses: [409] },
  );
}

export async function requestManualDeletionReview(
  expectedUserEmail: string,
): Promise<AccountDeletionExecuteResponse> {
  return invokeDeleteAccount<AccountDeletionExecuteResponse>(
    {
      confirmationText: 'MANUAL_REVIEW',
      expectedUserEmail,
      dryRunOnly: false,
    },
    { allowStatuses: [409] },
  );
}
