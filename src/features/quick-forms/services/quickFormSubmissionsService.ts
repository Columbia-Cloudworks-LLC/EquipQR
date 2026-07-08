import { supabase } from '@/integrations/supabase/client';
import type {
  QuickFormClientContext,
  QuickFormData,
  QuickFormFieldValue,
} from '@/features/quick-forms/types/quickForm';

export interface QuickFormSubmission {
  id: string;
  organization_id: string;
  quick_form_id: string;
  submitted_at: string;
  form_snapshot: (QuickFormData & { id?: string; name?: string; description?: string | null }) | null;
  field_values: QuickFormFieldValue[];
  client_context: QuickFormClientContext | null;
  request_fingerprint: string | null;
  created_at: string;
}

export interface QuickFormSubmissionFilters {
  quickFormId?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
}

export async function listQuickFormSubmissions(
  organizationId: string,
  filters: QuickFormSubmissionFilters = {},
): Promise<QuickFormSubmission[]> {
  let query = supabase
    .from('quick_form_submissions')
    .select('*')
    .eq('organization_id', organizationId)
    .order('submitted_at', { ascending: false })
    .limit(filters.limit ?? 500);

  if (filters.quickFormId) {
    query = query.eq('quick_form_id', filters.quickFormId);
  }
  if (filters.dateFrom) {
    query = query.gte('submitted_at', filters.dateFrom);
  }
  if (filters.dateTo) {
    query = query.lt('submitted_at', filters.dateTo);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as QuickFormSubmission[];
}
