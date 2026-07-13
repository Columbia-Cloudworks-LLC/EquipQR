import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { WorkOrder, WorkOrderPriority } from '@/features/work-orders/types/workOrder';
import { useVoiceTextAppender } from '@/hooks/useVoiceTextAppender';
import VoiceInputButton from '@/components/common/VoiceInputButton';
import VoiceInterimTranscript from '@/components/common/VoiceInterimTranscript';
import {
  canRunQRAction,
  type QRActionEquipment,
  type QRActionPermissionContext,
} from '@/features/equipment/services/equipmentQRPermissions';
import { createQRWorkOrder } from '@/features/equipment/services/equipmentQRActionService';
import { logger } from '@/utils/logger';
import { workOrders, workOrderMetrics } from '@/lib/queryKeys';
import WorkOrderCreationPhotoPicker from '@/features/work-orders/components/WorkOrderCreationPhotoPicker';
import { OFFLINE_CREATION_PHOTOS_MESSAGE } from '@/features/work-orders/utils/workOrderCreationImages';
import { toast } from 'sonner';
import { WorkOrderPMChecklist } from '@/features/work-orders/components/WorkOrderPMChecklist';
import type { WorkOrderFormData } from '@/features/work-orders/hooks/useWorkOrderForm';
import { QRDialogFormError } from '@/features/equipment/components/qr/QRDialogFormError';

interface QRWorkOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  equipment: QRActionEquipment;
  permissionContext: QRActionPermissionContext | null;
  scanId?: string | null;
  onCreated: (workOrder: WorkOrder) => void;
}

const priorityOptions: WorkOrderPriority[] = ['low', 'medium', 'high'];

function getDefaultPmTemplateId(equipment: QRActionEquipment): string | null {
  return equipment.defaultPmTemplateId ?? null;
}

const QRWorkOrderDialog: React.FC<QRWorkOrderDialogProps> = ({
  open,
  onOpenChange,
  equipment,
  permissionContext,
  scanId,
  onCreated,
}) => {
  const [title, setTitle] = useState(`Work order - ${equipment.name}`);
  const [description, setDescription] = useState(
    `Work order created from QR scan for ${equipment.name}.`,
  );
  const [priority, setPriority] = useState<WorkOrderPriority>('medium');
  const [dueDate, setDueDate] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [images, setImages] = useState<File[]>([]);
  const [hasPM, setHasPM] = useState(Boolean(getDefaultPmTemplateId(equipment)));
  const [pmTemplateId, setPmTemplateId] = useState<string | null>(getDefaultPmTemplateId(equipment));
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!open) {
      setImages([]);
      return;
    }

    const defaultTemplateId = getDefaultPmTemplateId(equipment);
    setTitle(`Work order - ${equipment.name}`);
    setDescription(`Work order created from QR scan for ${equipment.name}.`);
    setPmTemplateId(defaultTemplateId);
    setHasPM(Boolean(defaultTemplateId));
  }, [open, equipment.id, equipment.name, equipment.defaultPmTemplateId]);

  const selectedEquipment = useMemo(
    () => ({
      id: equipment.id,
      name: equipment.name,
      default_pm_template_id: equipment.defaultPmTemplateId ?? null,
    }),
    [equipment.defaultPmTemplateId, equipment.id, equipment.name],
  );

  const pmValues = useMemo(
    () => ({ hasPM, pmTemplateId }),
    [hasPM, pmTemplateId],
  );

  const setPmValue = useCallback(
    <K extends 'hasPM' | 'pmTemplateId'>(field: K, value: WorkOrderFormData[K]) => {
      if (field === 'hasPM') {
        setHasPM(Boolean(value));
        return;
      }
      setPmTemplateId(typeof value === 'string' ? value : null);
    },
    [],
  );

  const {
    isListening,
    error: speechError,
    interimTranscript,
    toggleListening,
    canUseVoice,
  } = useVoiceTextAppender({
    value: description,
    onChange: setDescription,
    disabled: isSubmitting,
  });

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!title.trim() || !description.trim()) {
      setError('Title and description are required.');
      return;
    }

    if (
      !permissionContext ||
      !canRunQRAction('generic-work-order', permissionContext, equipment.teamId)
    ) {
      setError('Permission changed. Re-open this action to continue.');
      return;
    }

    if (images.length > 0 && typeof navigator !== 'undefined' && !navigator.onLine) {
      setError(OFFLINE_CREATION_PHOTOS_MESSAGE);
      return;
    }

    setIsSubmitting(true);
    try {
      const selectedTemplateId = pmTemplateId ?? undefined;
      const { workOrder, creationPhotosAttached } = await createQRWorkOrder({
        equipment,
        title: title.trim(),
        description: description.trim(),
        priority,
        dueDate: dueDate || undefined,
        attachPM: hasPM && Boolean(selectedTemplateId),
        pmTemplateId: selectedTemplateId,
        images: images.length ? images : undefined,
        creationPhotoNote: images.length
          ? `Photos from QR work order request: ${title.trim()}`
          : undefined,
        scanId,
      });
      if (images.length > 0) {
        queryClient.invalidateQueries({ queryKey: workOrders.images(workOrder.id) });
        queryClient.invalidateQueries({
          queryKey: workOrders.notesWithImages(workOrder.id),
        });
        queryClient.invalidateQueries({
          queryKey: workOrderMetrics.imageCount(workOrder.id),
        });
        if (!creationPhotosAttached) {
          toast.warning(
            'Work order created, but photos did not attach. Open the work order to retry.',
          );
        }
      }
      setImages([]);
      onCreated(workOrder);
      onOpenChange(false);
    } catch (submitError) {
      logger.error('QR work order creation failed', submitError);
      setError(submitError instanceof Error ? submitError.message : 'Failed to create work order.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={isSubmitting ? undefined : onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New Work Order</DialogTitle>
          <DialogDescription>
            Create a work order pre-populated with {equipment.name} without opening the full dashboard.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <QRDialogFormError error={error} />

          <div className="space-y-2">
            <Label htmlFor="qr-work-order-title">Title</Label>
            <Input
              id="qr-work-order-title"
              value={title}
              onChange={event => setTitle(event.target.value)}
              disabled={isSubmitting}
              required
            />
          </div>

          <WorkOrderPMChecklist
            key={`qr-pm-${open}-${equipment.id}`}
            values={pmValues}
            setValue={setPmValue}
            selectedEquipment={selectedEquipment}
            autoDefaultFromEquipment
          />

          <div className="space-y-2">
            <Label htmlFor="qr-work-order-description">Description</Label>
            <div className="relative">
              <Textarea
                id="qr-work-order-description"
                value={description}
                onChange={event => setDescription(event.target.value)}
                disabled={isSubmitting}
                rows={4}
                required
                className="pb-12"
              />
              <VoiceInterimTranscript
                isListening={isListening}
                interimTranscript={interimTranscript}
                className="bottom-12 left-2 right-2"
              />
              <VoiceInputButton
                isListening={isListening}
                onToggle={toggleListening}
                canUseVoice={canUseVoice}
                className="absolute bottom-2 left-2"
              />
            </div>
            {speechError && (
              <p className="text-sm text-destructive">{speechError}</p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="qr-work-order-priority">Priority</Label>
              <Select
                value={priority}
                onValueChange={value => setPriority(value as WorkOrderPriority)}
                disabled={isSubmitting}
              >
                <SelectTrigger id="qr-work-order-priority">
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  {priorityOptions.map(option => (
                    <SelectItem key={option} value={option}>
                      {option.charAt(0).toUpperCase() + option.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="qr-work-order-due-date">Due Date (Optional)</Label>
              <Input
                id="qr-work-order-due-date"
                type="date"
                value={dueDate}
                onChange={event => setDueDate(event.target.value)}
                disabled={isSubmitting}
              />
            </div>
          </div>

          <WorkOrderCreationPhotoPicker
            images={images}
            onImagesChange={setImages}
            disabled={isSubmitting}
          />

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Work Order
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default QRWorkOrderDialog;
