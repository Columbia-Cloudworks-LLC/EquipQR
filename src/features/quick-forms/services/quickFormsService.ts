import { supabase } from '@/integrations/supabase/client';
import {
  getQrTokenSecret,
  rotateQrTokenViaRpc,
} from '@/features/public-forms/qrTokenSecretsService';
import type { QuickFormData } from '@/features/quick-forms/types/quickForm';

export interface QuickForm {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  form_data: QuickFormData;
  is_active: boolean;
  public_token_hash: string;
  token_rotated_at: string;
  token_rotated_by: string | null;
  created_by: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export async function listQuickForms(organizationId: string): Promise<QuickForm[]> {
  const { data, error } = await supabase
    .from('quick_forms')
    .select('*')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data ?? []) as unknown as QuickForm[];
}

/**
 * Create a quick form via SECURITY DEFINER RPC. The raw QR token is generated
 * and persisted server-side (admin-readable secrets table) so the printable
 * QR link stays available from any device.
 */
export async function createQuickForm(input: {
  organizationId: string;
  name: string;
  description?: string | null;
  formData: QuickFormData;
}): Promise<{ form: QuickForm; rawToken: string }> {
  const { data, error } = await supabase.rpc('create_quick_form', {
    p_organization_id: input.organizationId,
    p_name: input.name,
    p_description: input.description ?? null,
    p_form_data: input.formData as unknown as Record<string, unknown>,
  });

  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.quick_form_id || !row?.raw_token) {
    throw new Error('Quick form creation failed');
  }

  const { data: form, error: fetchError } = await supabase
    .from('quick_forms')
    .select('*')
    .eq('id', row.quick_form_id)
    .eq('organization_id', input.organizationId)
    .single();

  if (fetchError) throw fetchError;
  return {
    form: form as unknown as QuickForm,
    rawToken: row.raw_token as string,
  };
}

export async function updateQuickForm(input: {
  formId: string;
  organizationId: string;
  name?: string;
  description?: string | null;
  formData?: QuickFormData;
  isActive?: boolean;
}): Promise<QuickForm> {
  const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.name !== undefined) updateData.name = input.name;
  if (input.description !== undefined) updateData.description = input.description;
  if (input.formData !== undefined) updateData.form_data = input.formData;
  if (input.isActive !== undefined) updateData.is_active = input.isActive;

  const { data, error } = await supabase
    .from('quick_forms')
    .update(updateData)
    .eq('id', input.formId)
    .eq('organization_id', input.organizationId)
    .select()
    .single();

  if (error) throw error;
  return data as unknown as QuickForm;
}

export async function deleteQuickForm(formId: string, organizationId: string): Promise<void> {
  const { error } = await supabase
    .from('quick_forms')
    .delete()
    .eq('id', formId)
    .eq('organization_id', organizationId);

  if (error) throw error;
}

export function rotateQuickFormToken(formId: string): Promise<string> {
  return rotateQrTokenViaRpc('rotate_quick_form_token', { p_quick_form_id: formId });
}

/**
 * Fetch the persisted raw QR token for a form. RLS restricts reads to
 * organization owners/admins.
 */
export function getQuickFormToken(
  formId: string,
  organizationId: string,
): Promise<string | null> {
  return getQrTokenSecret('quick_form_token_secrets', 'quick_form_id', formId, organizationId);
}
