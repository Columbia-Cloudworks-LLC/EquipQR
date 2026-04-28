import React, { useState } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
import {
  canRunQRAction,
  type QRActionEquipment,
  type QRActionPermissionContext,
} from '@/features/equipment/services/equipmentQRPermissions';
import {
  createQRWorkOrder,
} from '@/features/equipment/services/equipmentQRActionService';
import { logger } from '@/utils/logger';

interface QRWorkOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  equipment: QRActionEquipment;
  permissionContext: QRActionPermissionContext | null;
  mode: 'pm' | 'generic';
  onCreated: (workOrder: WorkOrder) => void;
}

const priorityOptions: WorkOrderPriority[] = ['low', 'medium', 'high'];

const QRWorkOrderDialog: React.FC<QRWorkOrderDialogProps> = ({
  open,
  onOpenChange,
  equipment,
  permissionContext,
  mode,
  onCreated,
}) => {
  const isPM = mode === 'pm';
  const [title, setTitle] = useState(
    isPM ? `Preventative maintenance - ${equipment.name}` : `Work order - ${equipment.name}`
  );
  const [description, setDescription] = useState(
    isPM
      ? `Preventative maintenance work order created from QR scan for ${equipment.name}.`
      : `Work order created from QR scan for ${equipment.name}.`
  );
  const [priority, setPriority] = useState<WorkOrderPriority>('medium');
  const [dueDate, setDueDate] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!title.trim() || !description.trim()) {
      setError('Title and description are required.');
      return;
    }

    const action = isPM ? 'pm-work-order' : 'generic-work-order';
    if (
      !permissionContext ||
      !canRunQRAction(action, permissionContext, equipment.teamId)
    ) {
      setError('Permission changed. Re-open this action to continue.');
      return;
    }

    setIsSubmitting(true);
    try {
      const workOrder = await createQRWorkOrder({
        equipment,
        title: title.trim(),
        description: description.trim(),
        priority,
        dueDate: dueDate || undefined,
        attachPM: isPM,
      });
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
          <DialogTitle>
            {isPM ? 'New Preventative Maintenance Work Order' : 'Create New Generic Work Order'}
          </DialogTitle>
          <DialogDescription>
            Create a work order pre-populated with {equipment.name} without opening the full dashboard.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit}>
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

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

          <div className="space-y-2">
            <Label htmlFor="qr-work-order-description">Description</Label>
            <Textarea
              id="qr-work-order-description"
              value={description}
              onChange={event => setDescription(event.target.value)}
              disabled={isSubmitting}
              rows={4}
              required
            />
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

          {isPM && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                This will attach the equipment's assigned default PM template.
              </AlertDescription>
            </Alert>
          )}

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
