import type { CreateWorkOrderData } from '@/features/work-orders/hooks/useWorkOrderCreation';
import type { WorkOrderFormData } from '@/features/work-orders/schemas/workOrderSchema';
import { parseDue, persistDue } from '@/features/work-orders/calendar';

export function buildCreateWorkOrderData(
  data: WorkOrderFormData,
  creationImages: File[],
): CreateWorkOrderData {
  const persistedDue = persistDue(parseDue({
    dueDate: data.dueDate,
    dueDateHasTime: data.dueDateHasTime,
  }));

  return {
    title: data.title,
    description: data.description,
    equipmentId: data.equipmentId,
    priority: data.priority,
    dueDate: persistedDue.dueDate ?? undefined,
    dueDateHasTime: persistedDue.dueDateHasTime,
    estimatedHours: data.estimatedHours || undefined,
    equipmentWorkingHours: data.equipmentWorkingHours || undefined,
    hasPM: data.hasPM || false,
    pmTemplateId: data.pmTemplateId || undefined,
    assigneeId: data.assigneeId || undefined,
    images: creationImages.length ? creationImages : undefined,
    creationPhotoNote: creationImages.length
      ? `Photos from new work order: ${data.title}`
      : undefined,
  };
}
