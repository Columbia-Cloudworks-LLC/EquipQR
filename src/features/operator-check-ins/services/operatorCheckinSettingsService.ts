import { supabase } from '@/integrations/supabase/client';

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

async function hashToken(rawToken: string): Promise<string> {
  const data = new TextEncoder().encode(rawToken);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function generateRawToken(): string {
  const partA = crypto.randomUUID().replace(/-/g, '');
  const partB = crypto.randomUUID().replace(/-/g, '');
  return `${partA}${partB}`;
}

const assignmentSelect = `
  *,
  equipment:equipment_id (id, name, serial_number),
  template:template_id (id, name, description)
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

export async function createEquipmentOperatorCheckinAssignment(input: {
  organizationId: string;
  equipmentId: string;
  templateId: string;
  enabled?: boolean;
}): Promise<{ assignment: EquipmentOperatorCheckinAssignment; rawToken: string }> {
  const rawToken = generateRawToken();
  const tokenHash = await hashToken(rawToken);
  const { data, error } = await supabase
    .from('equipment_operator_checkin_settings')
    .insert({
      organization_id: input.organizationId,
      equipment_id: input.equipmentId,
      template_id: input.templateId,
      enabled: input.enabled ?? true,
      public_token_hash: tokenHash,
    })
    .select(assignmentSelect)
    .single();

  if (error) throw error;
  return { assignment: data as EquipmentOperatorCheckinAssignment, rawToken };
}

export async function deleteEquipmentOperatorCheckinAssignment(assignmentId: string): Promise<void> {
  const { error } = await supabase
    .from('equipment_operator_checkin_settings')
    .delete()
    .eq('id', assignmentId);

  if (error) throw error;
}

export async function rotateOperatorCheckinToken(assignmentId: string): Promise<string> {
  const { data, error } = await supabase.rpc('rotate_operator_checkin_token', {
    p_settings_id: assignmentId,
  });

  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.raw_token) {
    throw new Error('Token rotation failed');
  }
  return row.raw_token as string;
}
