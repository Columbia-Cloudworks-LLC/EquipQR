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

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data: sessionData } = await supabase.auth.getSession();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const accessToken = sessionData?.session?.access_token;
  if (!accessToken) {
    throw new Error('You must be signed in to manage account deletion.');
  }

  headers.Authorization = `Bearer ${accessToken}`;
  return headers;
}

function getDeleteAccountUrl(): string {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (!supabaseUrl) {
    throw new Error('Supabase URL is not configured.');
  }
  return `${supabaseUrl}/functions/v1/delete-account`;
}

async function parseDeleteAccountResponse<T>(
  res: Response,
  options?: { allowStatuses?: number[] },
): Promise<T> {
  const body = (await res.json().catch(() => ({}))) as T & { error?: string; message?: string };
  if (!res.ok && !options?.allowStatuses?.includes(res.status)) {
    throw new Error(body.error || body.message || 'Account deletion request failed.');
  }
  return body;
}

export async function previewAccountDeletion(): Promise<AccountDeletionPreview> {
  const headers = await getAuthHeaders();
  const res = await fetch(getDeleteAccountUrl(), {
    method: 'POST',
    headers,
    body: JSON.stringify({ dryRunOnly: true }),
  });

  const body = await parseDeleteAccountResponse<AccountDeletionDryRunResponse>(res);
  return body.preview;
}

export async function executeAccountDeletion(input: {
  confirmationText: string;
  expectedUserEmail: string;
}): Promise<AccountDeletionExecuteResponse> {
  const headers = await getAuthHeaders();
  const res = await fetch(getDeleteAccountUrl(), {
    method: 'POST',
    headers,
    body: JSON.stringify({
      confirmationText: input.confirmationText,
      expectedUserEmail: input.expectedUserEmail,
      dryRunOnly: false,
    }),
  });

  return parseDeleteAccountResponse<AccountDeletionExecuteResponse>(res, { allowStatuses: [409] });
}

export async function requestManualDeletionReview(
  expectedUserEmail: string,
): Promise<AccountDeletionExecuteResponse> {
  const headers = await getAuthHeaders();
  const res = await fetch(getDeleteAccountUrl(), {
    method: 'POST',
    headers,
    body: JSON.stringify({
      confirmationText: 'MANUAL_REVIEW',
      expectedUserEmail,
      dryRunOnly: false,
    }),
  });

  return parseDeleteAccountResponse<AccountDeletionExecuteResponse>(res, { allowStatuses: [409] });
}
