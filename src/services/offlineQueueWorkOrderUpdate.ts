import { supabase } from '@/integrations/supabase/client';
import { buildWorkOrderUpdatePayload } from '@/features/work-orders/utils/workOrderUpdatePayload';
import type { UpdateWorkOrderData } from '@/features/work-orders/hooks/useWorkOrderUpdate';
import { logger } from '@/utils/logger';
import type { WorkOrderServerSnapshot } from './offlineQueueService';

export const WORK_ORDER_UPDATE_FIELD_MAP: Record<string, keyof WorkOrderServerSnapshot> = {
  title: 'title',
  description: 'description',
  priority: 'priority',
  dueDate: 'due_date',
  estimatedHours: 'estimated_hours',
  hasPM: 'has_pm',
};

type WorkOrderMergeRow = {
  updated_at: string;
  title: string | null;
  description: string | null;
  priority: string | null;
  due_date: string | null;
  estimated_hours: number | null;
  has_pm: boolean | null;
};

export interface WorkOrderUpdateConflictInfo {
  workOrderId: string;
  type: 'field_conflict';
  details: string;
}

export interface WorkOrderUpdateSyncResult {
  success: boolean;
  conflict?: WorkOrderUpdateConflictInfo;
}

export function serverChangedWorkOrderField(
  current: WorkOrderMergeRow,
  dbCol: keyof WorkOrderServerSnapshot,
  serverSnapshot?: WorkOrderServerSnapshot,
): boolean {
  if (serverSnapshot && dbCol in serverSnapshot) {
    return String(current[dbCol] ?? '') !== String(serverSnapshot[dbCol] ?? '');
  }

  return true;
}

export function normalizeOfflineFieldValue(field: string, ourValue: unknown): unknown {
  return field === 'dueDate' || field === 'estimatedHours' ? (ourValue || null) : ourValue;
}

export function buildFieldLevelWorkOrderMerge(
  current: WorkOrderMergeRow,
  data: UpdateWorkOrderData,
  changedFields: string[],
  serverSnapshot: WorkOrderServerSnapshot | undefined,
  workOrderId: string,
): { safeUpdate: Record<string, unknown>; conflictingFields: string[] } {
  const safeUpdate: Record<string, unknown> = {};
  const conflictingFields: string[] = [];

  for (const field of changedFields) {
    const dbCol = WORK_ORDER_UPDATE_FIELD_MAP[field];
    if (!dbCol) continue;

    const ourValue = (data as Record<string, unknown>)[field];
    if (ourValue === undefined) continue;

    if (serverChangedWorkOrderField(current, dbCol, serverSnapshot)) {
      conflictingFields.push(field);
      logger.info(
        `Field-level conflict on WO ${workOrderId}.${field}: ` +
          `keeping server value "${current[dbCol]}", discarding offline value "${ourValue}"`,
      );
      continue;
    }

    safeUpdate[dbCol] = normalizeOfflineFieldValue(field, ourValue);
  }

  return { safeUpdate, conflictingFields };
}

export async function syncWorkOrderOfflineUpdate(
  workOrderId: string,
  data: UpdateWorkOrderData,
  options?: {
    changedFields?: string[];
    serverUpdatedAt?: string;
    serverSnapshot?: WorkOrderServerSnapshot;
  },
): Promise<WorkOrderUpdateSyncResult> {
  const { changedFields, serverUpdatedAt, serverSnapshot } = options ?? {};

  if (serverUpdatedAt && changedFields && changedFields.length > 0) {
    const { data: current, error: fetchErr } = await supabase
      .from('work_orders')
      .select('updated_at, title, description, priority, due_date, estimated_hours, has_pm')
      .eq('id', workOrderId)
      .single();

    if (fetchErr) throw fetchErr;

    if (current && current.updated_at !== serverUpdatedAt) {
      logger.info(`Conflict detected for WO ${workOrderId}: server updated_at differs`, {
        serverUpdatedAt,
        currentUpdatedAt: current.updated_at,
      });

      const { safeUpdate, conflictingFields } = buildFieldLevelWorkOrderMerge(
        current,
        data,
        changedFields,
        serverSnapshot,
        workOrderId,
      );

      if (Object.keys(safeUpdate).length > 0) {
        safeUpdate.updated_at = new Date().toISOString();
        const { error } = await supabase
          .from('work_orders')
          .update(safeUpdate)
          .eq('id', workOrderId);

        if (error) throw error;
      }

      if (conflictingFields.length > 0) {
        return {
          success: true,
          conflict: {
            workOrderId,
            type: 'field_conflict',
            details: `Server-side changes won for: ${conflictingFields.join(', ')}. Your offline edits to these fields were discarded.`,
          },
        };
      }

      return { success: true };
    }
  }

  const updateData = buildWorkOrderUpdatePayload(data);
  const { error } = await supabase
    .from('work_orders')
    .update(updateData)
    .eq('id', workOrderId)
    .select()
    .single();

  if (error) throw error;
  return { success: true };
}
