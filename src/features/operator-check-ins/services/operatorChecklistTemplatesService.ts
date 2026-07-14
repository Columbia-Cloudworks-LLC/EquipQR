import { supabase } from '@/integrations/supabase/client';
import { requireAuthUserIdFromClaims } from '@/lib/authClaims';
import { nanoid } from 'nanoid';
import {
  parseTemplateData,
  type OperatorChecklistDataField,
  type OperatorChecklistTemplateData,
  type OperatorChecklistTemplateItem,
  type OperatorInputFieldType,
} from '@/features/operator-check-ins/types/operatorChecklist';

export interface OperatorChecklistTemplate {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  template_data: OperatorChecklistTemplateData;
  is_active: boolean;
  created_by: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

function mapTemplateRow(row: Record<string, unknown>): OperatorChecklistTemplate {
  return {
    ...(row as Omit<OperatorChecklistTemplate, 'template_data'>),
    template_data: parseTemplateData(row.template_data),
  };
}

export async function listOperatorChecklistTemplates(organizationId: string): Promise<OperatorChecklistTemplate[]> {
  const { data, error } = await supabase
    .from('operator_checklist_templates')
    .select('*')
    .eq('organization_id', organizationId)
    .order('name');

  if (error) throw error;
  return (data ?? []).map((row) => mapTemplateRow(row as Record<string, unknown>));
}

export async function getOperatorChecklistTemplate(
  templateId: string,
  organizationId: string,
): Promise<OperatorChecklistTemplate | null> {
  const { data, error } = await supabase
    .from('operator_checklist_templates')
    .select('*')
    .eq('id', templateId)
    .eq('organization_id', organizationId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return mapTemplateRow(data as Record<string, unknown>);
}

export async function createOperatorChecklistTemplate(input: {
  organizationId: string;
  name: string;
  description?: string;
  templateData?: OperatorChecklistTemplateData;
}): Promise<OperatorChecklistTemplate> {
  const userId = await requireAuthUserIdFromClaims();
  const { data, error } = await supabase
    .from('operator_checklist_templates')
    .insert({
      organization_id: input.organizationId,
      name: input.name.trim(),
      description: input.description?.trim() ?? null,
      template_data: input.templateData ?? createDefaultTemplateData(),
      created_by: userId,
      updated_by: userId,
    })
    .select('*')
    .single();

  if (error) throw error;
  return mapTemplateRow(data as Record<string, unknown>);
}

export async function updateOperatorChecklistTemplate(
  templateId: string,
  organizationId: string,
  updates: {
    name?: string;
    description?: string | null;
    isActive?: boolean;
    templateData?: OperatorChecklistTemplateData;
  },
): Promise<OperatorChecklistTemplate> {
  const userId = await requireAuthUserIdFromClaims();
  const payload: Record<string, unknown> = { updated_by: userId, updated_at: new Date().toISOString() };
  if (updates.name !== undefined) payload.name = updates.name.trim();
  if (updates.description !== undefined) payload.description = updates.description;
  if (updates.isActive !== undefined) payload.is_active = updates.isActive;
  if (updates.templateData !== undefined) payload.template_data = updates.templateData;

  const { data, error } = await supabase
    .from('operator_checklist_templates')
    .update(payload)
    .eq('id', templateId)
    .eq('organization_id', organizationId)
    .select('*')
    .single();

  if (error) throw error;
  return mapTemplateRow(data as Record<string, unknown>);
}

export interface DeleteOperatorChecklistTemplateResult {
  purged: boolean;
  disabledAssignmentCount: number;
}

export async function deleteOperatorChecklistTemplate(
  templateId: string,
): Promise<DeleteOperatorChecklistTemplateResult> {
  const { data, error } = await supabase.rpc('delete_operator_checklist_template', {
    p_template_id: templateId,
  });

  if (error) throw error;
  const result = typeof data === 'number' ? data : 0;
  return {
    purged: result === -1,
    disabledAssignmentCount: result === -1 ? 0 : result,
  };
}

export async function restoreOperatorChecklistTemplate(
  templateId: string,
): Promise<{ reenabledAssignmentCount: number }> {
  const { data, error } = await supabase.rpc('restore_operator_checklist_template', {
    p_template_id: templateId,
  });

  if (error) throw error;
  return { reenabledAssignmentCount: typeof data === 'number' ? data : 0 };
}

export function createDefaultTemplateData(): OperatorChecklistTemplateData {
  return {
    dataFields: [createDefaultOperatorDataField()],
    checklistItems: [createDefaultOperatorChecklistItem('Daily Safety')],
  };
}

export function createDefaultOperatorChecklistItem(section: string): OperatorChecklistTemplateItem {
  return {
    id: nanoid(10),
    title: 'New check item',
    required: true,
    section,
  };
}

export function createDefaultOperatorDataField(): OperatorChecklistDataField {
  return {
    id: nanoid(10),
    label: 'Your name',
    source: 'operator_input',
    inputType: 'text',
    required: true,
  };
}

export function createOperatorDataField(
  source: OperatorChecklistDataField['source'],
  partial?: Partial<OperatorChecklistDataField>,
): OperatorChecklistDataField {
  const base: OperatorChecklistDataField = {
    id: nanoid(10),
    label: 'New field',
    source,
    required: false,
  };

  if (source === 'operator_input') {
    base.inputType = 'text' satisfies OperatorInputFieldType;
  }

  return { ...base, ...partial };
}
