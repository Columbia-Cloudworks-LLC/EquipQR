import { supabase } from '@/integrations/supabase/client';
import {
  getQrTokenSecret,
  rotateQrTokenViaRpc,
} from '@/features/public-forms/qrTokenSecretsService';

export interface EquipmentOperatorCheckinAssignment {
  id: string;
  organization_id: string;
  equipment_id: string;
  template_id: string;
  enabled: boolean;
  public_token_hash: string;
  token_rotated_at: string;
  token_rotated_by: string | null;
  created_at: string;
  updated_at: string;
  equipment?: { id: string; name: string; serial_number: string | null } | null;
  template?: { id: string; name: string; description: string | null } | null;
}

const assignmentSelect = `
  *,
  equipment!equipment_operator_checkin_settings_equipment_org_fkey (id, name, serial_number),
  template:operator_checklist_templates!equipment_operator_checkin_settings_template_org_fkey (id, name, description)
`;

export async function listEquipmentOperatorCheckinAssignments(
  equipmentId: string,
  organizationId: string,
): Promise<EquipmentOperatorCheckinAssignment[]> {
  const { data, error } = await supabase
    .from('equipment_operator_checkin_settings')
    .select(assignmentSelect)
    .eq('equipment_id', equipmentId)
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data ?? []) as EquipmentOperatorCheckinAssignment[];
}

export async function listOrganizationOperatorCheckinAssignments(
  organizationId: string,
): Promise<EquipmentOperatorCheckinAssignment[]> {
  const { data, error } = await supabase
    .from('equipment_operator_checkin_settings')
    .select(assignmentSelect)
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data ?? []) as EquipmentOperatorCheckinAssignment[];
}

/**
 * Create an assignment via SECURITY DEFINER RPC. The raw QR token is generated
 * and persisted server-side (admin-readable secrets table) so the printable QR
 * link stays available from any device (#1154).
 */
export async function createEquipmentOperatorCheckinAssignment(input: {
  organizationId: string;
  equipmentId: string;
  templateId: string;
  enabled?: boolean;
}): Promise<{ assignment: EquipmentOperatorCheckinAssignment; rawToken: string }> {
  const { data, error } = await supabase.rpc('create_operator_checkin_assignment', {
    p_organization_id: input.organizationId,
    p_equipment_id: input.equipmentId,
    p_template_id: input.templateId,
    p_enabled: input.enabled ?? true,
  });

  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.settings_id || !row?.raw_token) {
    throw new Error('Assignment creation failed');
  }

  const { data: assignment, error: fetchError } = await supabase
    .from('equipment_operator_checkin_settings')
    .select(assignmentSelect)
    .eq('id', row.settings_id)
    .eq('organization_id', input.organizationId)
    .single();

  if (fetchError) throw fetchError;
  return {
    assignment: assignment as EquipmentOperatorCheckinAssignment,
    rawToken: row.raw_token as string,
  };
}

export async function deleteEquipmentOperatorCheckinAssignment(assignmentId: string): Promise<void> {
  const { error } = await supabase
    .from('equipment_operator_checkin_settings')
    .delete()
    .eq('id', assignmentId);

  if (error) throw error;
}

export function rotateOperatorCheckinToken(assignmentId: string): Promise<string> {
  return rotateQrTokenViaRpc('rotate_operator_checkin_token', { p_settings_id: assignmentId });
}

/**
 * Fetch the persisted raw QR token for an assignment. RLS restricts reads to
 * organization owners/admins; other members resolve to null (same UX as the
 * legacy in-memory cache miss). Legacy assignments minted before persistence
 * also resolve to null until their token is rotated.
 */
export function getOperatorCheckinToken(
  assignmentId: string,
  organizationId: string,
): Promise<string | null> {
  return getQrTokenSecret('operator_checkin_token_secrets', 'settings_id', assignmentId, organizationId);
}
