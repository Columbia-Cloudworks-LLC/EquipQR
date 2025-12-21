import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, AlertTriangle } from 'lucide-react';
import { getEquipmentDeletionImpact } from '@/features/equipment/services/deleteEquipmentService';
import { useDeleteEquipment } from '@/features/equipment/hooks/useDeleteEquipment';

interface DeleteEquipmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  equipmentId: string;
  equipmentName: string;
  orgId: string;
  onSuccess: () => void;
}

export const DeleteEquipmentDialog = ({ 
  open, 
  onOpenChange, 
  equipmentId, 
  equipmentName,
  orgId,
  onSuccess 
}: DeleteEquipmentDialogProps) => {
  const [step, setStep] = useState<'initial' | 'confirmation'>('initial');
  const [acknowledged, setAcknowledged] = useState(false);
  
  const deleteEquipmentMutation = useDeleteEquipment();

  // Fetch deletion impact when dialog opens
  const { data: impact, isLoading: impactLoading } = useQuery({
    queryKey: ['equipment-deletion-impact', equipmentId],
    queryFn: () => getEquipmentDeletionImpact(equipmentId),
    enabled: open && step === 'initial',
  });

  const handleContinue = () => {
    setStep('confirmation');
  };

  const handleDelete = async () => {
    try {
      await deleteEquipmentMutation.mutateAsync({ equipmentId, orgId });
      onSuccess();
      onOpenChange(false);
      setStep('initial');
      setAcknowledged(false);
    } catch {
      // Error handling is done in the mutation
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
    setStep('initial');
    setAcknowledged(false);
  };

  const handleDialogChange = (open: boolean) => {
    if (!open) {
      setStep('initial');
      setAcknowledged(false);
    }
    onOpenChange(open);
  };

  const totalImages = (impact?.equipmentNoteImages || 0) + (impact?.workOrderImages || 0);

  if (step === 'initial') {
    return (
      <AlertDialog open={open} onOpenChange={handleDialogChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Delete this equipment?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              <p>
                This will permanently delete <strong>{equipmentName}</strong> and all associated data.
              </p>
              
              {impactLoading ? (
                <div className="flex items-center gap-2 text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Calculating impact...
                </div>
              ) : impact ? (
                <div className="bg-muted rounded-lg p-4 space-y-2 text-sm">
                  <div className="font-medium">This will delete:</div>
                  <ul className="space-y-1">
                    <li>• Work orders: <strong>{impact.workOrders}</strong></li>
                    <li>• Preventative maintenance records: <strong>{impact.pmCount}</strong></li>
                    <li>• Images (notes + work orders): <strong>{totalImages}</strong></li>
                  </ul>
                </div>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancel}>Cancel</AlertDialogCancel>
            <Button 
              onClick={handleContinue}
              variant="destructive"
              disabled={impactLoading}
            >
              Continue
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Confirm Equipment Deletion
          </DialogTitle>
          <DialogDescription className="space-y-4">
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
              <p className="font-medium text-destructive mb-2">
                ⚠️ This action cannot be undone
              </p>
              <p className="text-sm">
                Deleting <strong>{equipmentName}</strong> will permanently and irreversibly delete:
              </p>
              <ul className="text-sm mt-2 space-y-1">
                <li>• The equipment record</li>
                <li>• All work orders tied to it</li>
                <li>• All PM records tied to those work orders</li>
                <li>• All images from equipment notes and work orders (files removed from storage)</li>
              </ul>
            </div>

            <div className="flex items-start space-x-2">
              <Checkbox 
                id="acknowledge"
                checked={acknowledged}
                onCheckedChange={(checked) => setAcknowledged(checked === true)}
              />
              <label 
                htmlFor="acknowledge" 
                className="text-sm leading-5 cursor-pointer"
              >
                I understand this will permanently delete this equipment and all related work orders, PMs, and images.
              </label>
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button 
            variant="destructive"
            onClick={handleDelete}
            disabled={!acknowledged || deleteEquipmentMutation.isPending}
          >
            {deleteEquipmentMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Deleting...
              </>
            ) : (
              'Delete Forever'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};