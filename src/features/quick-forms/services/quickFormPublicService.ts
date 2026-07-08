import { supabase } from '@/integrations/supabase/client';
import type { QuickFormField } from '@/features/quick-forms/types/quickForm';

export interface QuickFormPublicLoadResult {
  form: {
    id: string;
    name: string;
    description: string | null;
    organizationName: string;
    fields: QuickFormField[];
    collectLocation: boolean;
  };
  captchaRequired: boolean;
}

export interface QuickFormPublicSubmitInput {
  token: string;
  fieldValues: Record<string, unknown>;
  clientTimezone?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  captchaToken?: string;
}

export interface QuickFormPublicSubmitResult {
  success: boolean;
  submissionId: string;
  submittedAt: string;
}

async function invokeQuickForm<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('quick-form', { body });
  if (error) {
    let message = 'Request failed';
    try {
      const context = (error as { context?: Response }).context;
      if (context) {
        const parsed = await context.json();
        if (parsed?.error) message = parsed.error;
      }
    } catch {
      // Fall back to the generic message.
    }
    throw new Error(message);
  }
  return data as T;
}

export function loadQuickForm(token: string): Promise<QuickFormPublicLoadResult> {
  return invokeQuickForm<QuickFormPublicLoadResult>({ action: 'load', token });
}

export function submitQuickForm(
  input: QuickFormPublicSubmitInput,
): Promise<QuickFormPublicSubmitResult> {
  return invokeQuickForm<QuickFormPublicSubmitResult>({
    action: 'submit',
    token: input.token,
    fieldValues: input.fieldValues,
    clientTimezone: input.clientTimezone ?? null,
    latitude: input.latitude ?? null,
    longitude: input.longitude ?? null,
    captchaToken: input.captchaToken,
  });
}
