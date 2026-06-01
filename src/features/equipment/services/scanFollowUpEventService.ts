import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import { getAuthClaims } from '@/lib/authClaims';
import { logger } from '@/utils/logger';

/**
 * Structured follow-up actions performed from a single QR scan session.
 * Mirrors the `event_type` CHECK constraint on `public.scan_follow_up_events`.
 */
export type ScanFollowUpEventType =
  | 'dashboard_opened'
  | 'pm_work_order_created'
  | 'generic_work_order_created'
  | 'working_hours_updated'
  | 'note_image_added';

export interface ScanFollowUpEvent extends Tables<'scan_follow_up_events'> {
  performedByName?: string;
}

export interface RecordScanFollowUpEventInput {
  organizationId: string;
  scanId: string;
  equipmentId: string;
  eventType: ScanFollowUpEventType;
  entityType?: string | null;
  entityId?: string | null;
  /** Minimal, non-sensitive context. Never include note content or raw image data. */
  metadata?: Record<string, unknown>;
}

/**
 * Record a single scan follow-up event.
 *
 * `performed_by` is always derived from the authenticated JWT claims so callers
 * cannot attribute an action to another user. This is intended to be called
 * best-effort after a primary action succeeds: callers should wrap it in a
 * try/catch and never block or roll back the primary action on failure.
 *
 * @returns the inserted event id
 */
export async function recordScanFollowUpEvent(
  input: RecordScanFollowUpEventInput
): Promise<string> {
  const performedBy = (await getAuthClaims())?.sub;
  if (!performedBy) {
    throw new Error('User not authenticated');
  }

  const { data: equipment, error: equipmentError } = await supabase
    .from('equipment')
    .select('id')
    .eq('id', input.equipmentId)
    .eq('organization_id', input.organizationId)
    .maybeSingle();

  if (equipmentError || !equipment) {
    throw new Error('Equipment not found in organization');
  }

  const { data, error } = await supabase
    .from('scan_follow_up_events')
    .insert({
      scan_id: input.scanId,
      equipment_id: input.equipmentId,
      event_type: input.eventType,
      entity_type: input.entityType ?? null,
      entity_id: input.entityId ?? null,
      metadata: (input.metadata ?? {}) as Tables<'scan_follow_up_events'>['metadata'],
      performed_by: performedBy,
    })
    .select('id')
    .single();

  if (error) {
    logger.error('Failed to record scan follow-up event', error);
    throw new Error(error.message);
  }

  return data.id;
}

/**
 * Fetch scan follow-up events for an equipment record, newest first.
 *
 * RLS enforces tenant isolation; the inner equipment join plus
 * `equipment.organization_id` filter keeps the query org-scoped as defense in
 * depth and matches the pattern used by `EquipmentService.getScansByEquipmentId`.
 */
export async function getScanFollowUpEventsByEquipmentId(
  organizationId: string,
  equipmentId: string
): Promise<ScanFollowUpEvent[]> {
  const { data, error } = await supabase
    .from('scan_follow_up_events')
    .select(`
      *,
      performed_by_profile:profiles!scan_follow_up_events_performed_by_fkey (
        id,
        name
      ),
      equipment!inner (
        organization_id
      )
    `)
    .eq('equipment_id', equipmentId)
    .eq('equipment.organization_id', organizationId)
    .order('performed_at', { ascending: false });

  if (error) {
    logger.error('Failed to fetch scan follow-up events', error);
    throw new Error(error.message);
  }

  return (data ?? []).map((event) => ({
    ...event,
    performedByName:
      (event.performed_by_profile as { name?: string } | null | undefined)?.name ||
      event.performed_by_name ||
      'Unknown',
  }));
}
