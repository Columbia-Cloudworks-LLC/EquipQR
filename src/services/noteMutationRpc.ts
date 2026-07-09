import { supabase } from '@/integrations/supabase/client';

interface RpcResult {
  success?: boolean;
  error?: string;
}

function parseRpcResult(data: unknown): RpcResult {
  if (!data || typeof data !== 'object') return { success: false, error: 'Invalid response' };
  return data as RpcResult;
}

function assertRpcSuccess(data: unknown, fallbackMessage: string): void {
  const result = parseRpcResult(data);
  if (!result.success) {
    throw new Error(result.error || fallbackMessage);
  }
}

export async function updateEquipmentNoteRpc(params: {
  organizationId: string;
  equipmentId: string;
  noteId: string;
  content?: string;
  isPrivate?: boolean;
}): Promise<void> {
  const { data, error } = await supabase.rpc('update_equipment_note', {
    p_organization_id: params.organizationId,
    p_equipment_id: params.equipmentId,
    p_note_id: params.noteId,
    p_content: params.content ?? null,
    p_is_private: params.isPrivate ?? null,
  });
  if (error) throw error;
  assertRpcSuccess(data, 'Failed to update equipment note');
}

export async function deleteEquipmentNoteRpc(params: {
  organizationId: string;
  equipmentId: string;
  noteId: string;
}): Promise<void> {
  const { data, error } = await supabase.rpc('delete_equipment_note', {
    p_organization_id: params.organizationId,
    p_equipment_id: params.equipmentId,
    p_note_id: params.noteId,
  });
  if (error) throw error;
  assertRpcSuccess(data, 'Failed to delete equipment note');
}

export async function deleteEquipmentNoteImageAuditedRpc(params: {
  organizationId: string;
  equipmentId: string;
  imageId: string;
}): Promise<void> {
  const { data, error } = await supabase.rpc('delete_equipment_note_image_audited', {
    p_organization_id: params.organizationId,
    p_equipment_id: params.equipmentId,
    p_image_id: params.imageId,
  });
  if (error) throw error;
  assertRpcSuccess(data, 'Failed to delete equipment note image');
}

export async function updateWorkOrderNoteRpc(params: {
  organizationId: string;
  workOrderId: string;
  noteId: string;
  content?: string;
  isPrivate?: boolean;
}): Promise<void> {
  const { data, error } = await supabase.rpc('update_work_order_note', {
    p_organization_id: params.organizationId,
    p_work_order_id: params.workOrderId,
    p_note_id: params.noteId,
    p_content: params.content ?? null,
    p_is_private: params.isPrivate ?? null,
  });
  if (error) throw error;
  assertRpcSuccess(data, 'Failed to update work order note');
}

export async function deleteWorkOrderNoteRpc(params: {
  organizationId: string;
  workOrderId: string;
  noteId: string;
}): Promise<void> {
  const { data, error } = await supabase.rpc('delete_work_order_note', {
    p_organization_id: params.organizationId,
    p_work_order_id: params.workOrderId,
    p_note_id: params.noteId,
  });
  if (error) throw error;
  assertRpcSuccess(data, 'Failed to delete work order note');
}

export async function deleteWorkOrderNoteImageAuditedRpc(params: {
  organizationId: string;
  workOrderId: string;
  imageId: string;
}): Promise<void> {
  const { data, error } = await supabase.rpc('delete_work_order_note_image_audited', {
    p_organization_id: params.organizationId,
    p_work_order_id: params.workOrderId,
    p_image_id: params.imageId,
  });
  if (error) throw error;
  assertRpcSuccess(data, 'Failed to delete work order note image');
}
