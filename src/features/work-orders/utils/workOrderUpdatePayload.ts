import type { UpdateWorkOrderData } from '@/features/work-orders/hooks/useWorkOrderUpdate';

/** Maps camelCase work-order update fields to Supabase `work_orders` column payload. */
export function buildWorkOrderUpdatePayload(data: UpdateWorkOrderData): Record<string, unknown> {
  const updateData: Record<string, unknown> = {};
  if (data.title !== undefined) updateData.title = data.title;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.priority !== undefined) updateData.priority = data.priority;
  if (data.dueDate !== undefined) updateData.due_date = data.dueDate || null;
  if (data.estimatedHours !== undefined) updateData.estimated_hours = data.estimatedHours || null;
  if (data.hasPM !== undefined) updateData.has_pm = data.hasPM;
  updateData.updated_at = new Date().toISOString();
  return updateData;
}
