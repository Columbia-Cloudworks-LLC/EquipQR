import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ExternalLink, Wrench } from 'lucide-react';
import { WorkOrderPMChecklist } from '@/features/work-orders/components/WorkOrderPMChecklist';
import type { WorkOrderFormData } from '@/features/work-orders/hooks/useWorkOrderForm';
import type { WorkOrder } from '@/features/work-orders/types/workOrder';
import type { PreventativeMaintenance } from '@/features/pm-templates/services/preventativeMaintenanceService';
import { WORK_ORDER_PM_MANAGEMENT_DOCS_URL } from '@/lib/documentationUrl';

interface WorkOrderPMManagementDialogProps {
  open: boolean;
  onClose: () => void;
  workOrder: WorkOrder;
  pmData?: PreventativeMaintenance | null;
  equipment?: {
    id: string;
    name: string;
    default_pm_template_id?: string | null;
  } | null;
  equipmentId: string;
  isUpdating?: boolean;
  pmLoading?: boolean;
  onSave: (data: WorkOrderFormData, originalHasPM: boolean, equipmentId: string) => Promise<void>;
}

export function WorkOrderPMManagementDialog({
  open,
  onClose,
  workOrder,
  pmData,
  equipment,
  equipmentId,
  isUpdating = false,
  pmLoading = false,
  onSave,
}: WorkOrderPMManagementDialogProps) {
  const [pmTemplateId, setPmTemplateId] = useState<string | null>(
    pmData?.template_id ?? null,
  );

  useEffect(() => {
    if (!open) return;
    setPmTemplateId(pmData?.template_id ?? null);
  }, [open, pmData?.template_id]);

  const hasPM = Boolean(pmTemplateId);
  const isPmDataPending = workOrder.has_pm && pmLoading;

  const values = useMemo(
    () => ({ hasPM, pmTemplateId }),
    [hasPM, pmTemplateId],
  );

  const setValue = useCallback(
    <K extends 'hasPM' | 'pmTemplateId'>(field: K, value: WorkOrderFormData[K]) => {
      if (field === 'hasPM') {
        if (!value) {
          setPmTemplateId(null);
        }
        return;
      }
      setPmTemplateId(typeof value === 'string' ? value : null);
    },
    [],
  );

  const selectedEquipment = useMemo(() => {
    if (!equipment) {
      return {
        id: equipmentId,
        name: 'Equipment',
        default_pm_template_id: null as string | null,
      };
    }
    return {
      id: equipment.id,
      name: equipment.name,
      default_pm_template_id: equipment.default_pm_template_id ?? null,
    };
  }, [equipment, equipmentId]);

  const handleSave = async () => {
    if (isPmDataPending) {
      return;
    }

    const formData: WorkOrderFormData = {
      title: workOrder.title,
      description: workOrder.description ?? '',
      equipmentId,
      priority: workOrder.priority,
      dueDate: workOrder.due_date ?? null,
      estimatedHours: workOrder.estimated_hours ?? null,
      equipmentWorkingHours: null,
      hasPM,
      pmTemplateId: hasPM ? pmTemplateId : null,
      assigneeId: workOrder.assignee_id ?? null,
      isHistorical: workOrder.is_historical ?? false,
    };

    await onSave(formData, workOrder.has_pm, equipmentId);
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[calc(100dvh-2rem)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Manage PM Checklist
          </DialogTitle>
          <DialogDescription>
            Add, change, or remove the preventative maintenance template on this work order.
            Work order photos, notes, and costs stay attached when you change the PM template.
          </DialogDescription>
        </DialogHeader>

        <WorkOrderPMChecklist
          values={values}
          setValue={setValue}
          selectedEquipment={selectedEquipment}
          allowTemplateOverride
        />

        <p className="text-xs text-muted-foreground">
          <a
            href={WORK_ORDER_PM_MANAGEMENT_DOCS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 underline underline-offset-2 hover:text-foreground"
          >
            Learn more in the Help Center
            <ExternalLink className="h-3 w-3" aria-hidden="true" />
          </a>
        </p>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={isUpdating}>
            Cancel
          </Button>
          <Button type="button" onClick={() => { void handleSave(); }} disabled={isUpdating || isPmDataPending}>
            {isUpdating ? 'Saving…' : 'Save PM Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
