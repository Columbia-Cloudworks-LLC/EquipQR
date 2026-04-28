import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AlertCircle, Loader2 } from 'lucide-react';
import { updateQRWorkingHours, type QRActionEquipment } from '@/features/equipment/services/equipmentQRActionService';
import { logger } from '@/utils/logger';

interface QRWorkingHoursDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  equipment: QRActionEquipment;
  onSuccess: (newHours: number) => void;
}

const QRWorkingHoursDialog: React.FC<QRWorkingHoursDialogProps> = ({
  open,
  onOpenChange,
  equipment,
  onSuccess,
}) => {
  const [newHours, setNewHours] = useState(
    equipment.workingHours == null ? '' : String(equipment.workingHours)
  );
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const parsedHours = Number(newHours);
    if (!Number.isFinite(parsedHours) || parsedHours < 0) {
      setError('Enter a valid non-negative hour value.');
      return;
    }

    setIsSubmitting(true);
    try {
      await updateQRWorkingHours({
        equipmentId: equipment.id,
        newHours: parsedHours,
        notes: reason.trim() || undefined,
      });

      onSuccess(parsedHours);
      onOpenChange(false);
    } catch (submitError) {
      logger.error('Failed to update QR working hours', submitError);
      setError(submitError instanceof Error ? submitError.message : 'Unable to update hours.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Update Hours</DialogTitle>
          <DialogDescription>
            Record the latest machine hours for {equipment.name}. The existing audit history will capture the prior value,
            new value, updater, and timestamp.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit}>
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="rounded-md border bg-muted/40 p-3 text-sm">
            Current hours:{' '}
            <span className="font-semibold">
              {equipment.workingHours == null ? 'Not recorded' : `${equipment.workingHours} hours`}
            </span>
          </div>

          <div className="space-y-2">
            <Label htmlFor="qr-new-hours">New total hours</Label>
            <Input
              id="qr-new-hours"
              type="number"
              min="0"
              step="0.1"
              value={newHours}
              onChange={event => setNewHours(event.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="qr-hours-reason">Reason or note (optional)</Label>
            <Textarea
              id="qr-hours-reason"
              value={reason}
              onChange={event => setReason(event.target.value)}
              placeholder="Meter reading, field service update, or correction reason"
              rows={3}
            />
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
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
              Update Hours
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default QRWorkingHoursDialog;
