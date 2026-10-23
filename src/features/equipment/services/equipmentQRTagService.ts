import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import { requireAuthUserIdFromClaims } from '@/lib/authClaims';

export type EquipmentQRTagRow = Tables<'equipment_qr_tags'>;

export interface UnassignedQRTagContext {
  tag: {
    id: string;
    organizationId: string;
    shortCode: string;
    labelBatchName: string | null;
    status: 'unassigned' | 'claimed';
    claimedEquipmentId: string | null;
    createdAt: string;
  };
  organization: {
    id: string;
    name: string;
    scan_location_collection_enabled: boolean;
  };
  userRole: string;
}

export class UnassignedQRTagDetectedError extends Error {
  readonly context: UnassignedQRTagContext;

  constructor(context: UnassignedQRTagContext) {
    super(`Unassigned QR tag ${context.tag.shortCode}`);
    this.name = 'UnassignedQRTagDetectedError';
    this.context = context;
  }
}

const SHORT_CODE_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

/**
 * Generate a human-readable short tag identifier (e.g. `TAG-7K9P2M`) suitable
 * for printing underneath a pre-allocated QR code.
 */
export function generateShortTagCode(randomBytes?: Uint8Array): string {
  const bytes = randomBytes ?? new Uint8Array(6);
  if (!randomBytes && typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(bytes);
  } else if (!randomBytes) {
    for (let i = 0; i < bytes.length; i += 1) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }

  let token = '';
  for (let i = 0; i < 6; i += 1) {
    const byte = bytes[i] ?? 0;
    token += SHORT_CODE_ALPHABET[byte % SHORT_CODE_ALPHABET.length];
  }
  return `TAG-${token}`;
}

/**
 * Mint a batch of pre-registered unassigned QR tags for an organization.
 * Restricted by RLS to organization owners and admins.
 */
export async function createQRTagBatch(params: {
  organizationId: string;
  count: number;
  labelBatchName?: string;
}): Promise<EquipmentQRTagRow[]> {
  const { organizationId, count, labelBatchName } = params;
  if (!organizationId) {
    throw new Error('Organization ID is required');
  }
  if (!Number.isInteger(count) || count < 1 || count > 100) {
    throw new Error('Batch size must be between 1 and 100 tags');
  }

  const userId = await requireAuthUserIdFromClaims();
  const batchName = labelBatchName?.trim() ? labelBatchName.trim() : null;
  const codes = new Set<string>();
  while (codes.size < count) {
    codes.add(generateShortTagCode());
  }

  const rowsToInsert = Array.from(codes).map((shortCode) => ({
    organization_id: organizationId,
    short_code: shortCode,
    label_batch_name: batchName,
    status: 'unassigned',
    created_by: userId,
  }));

  const { data, error } = await supabase
    .from('equipment_qr_tags')
    .insert(rowsToInsert)
    .select('*');

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

/**
 * List unassigned QR tags for an organization so shops can reprint or inspect
 * pre-allocated label sheets.
 */
export async function listUnassignedQRTags(
  organizationId: string,
  limit = 60,
): Promise<EquipmentQRTagRow[]> {
  if (!organizationId) return [];

  const { data, error } = await supabase
    .from('equipment_qr_tags')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('status', 'unassigned')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

/**
 * Atomically claim an unassigned QR tag and associate it with an equipment record.
 */
export async function claimQRTagForEquipment(
  tagId: string,
  equipmentId: string,
): Promise<EquipmentQRTagRow> {
  if (!tagId || !equipmentId) {
    throw new Error('Both QR tag ID and equipment ID are required');
  }

  const { data, error } = await supabase.rpc('claim_equipment_qr_tag', {
    p_tag_id: tagId,
    p_equipment_id: equipmentId,
  });

  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    throw new Error('Failed to claim QR tag');
  }

  return data;
}
