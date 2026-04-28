import React, { useCallback, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import InlineNoteComposer from '@/components/common/InlineNoteComposer';
import { createQREquipmentNote } from '@/features/equipment/services/equipmentQRActionService';
import { logger } from '@/utils/logger';

interface QRNoteImageDialogProps {
  open: boolean;
  onClose: () => void;
  equipmentId: string;
  equipmentName: string;
  organizationId: string;
  userDisplayName: string;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

const QRNoteImageDialog: React.FC<QRNoteImageDialogProps> = ({
  open,
  onClose,
  equipmentId,
  equipmentName,
  organizationId,
  userDisplayName,
  onSuccess,
  onError,
}) => {
  const [noteContent, setNoteContent] = useState('');
  const [attachedImages, setAttachedImages] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetAndClose = useCallback(() => {
    setNoteContent('');
    setAttachedImages([]);
    onClose();
  }, [onClose]);

  const handleSubmit = async (data: {
    content: string;
    images: File[];
    machineHours?: number;
    isPrivate?: boolean;
  }) => {
    let finalContent = data.content.trim();
    if (!finalContent && data.images.length > 0) {
      finalContent =
        data.images.length === 1
          ? `${userDisplayName} uploaded 1 image.`
          : `${userDisplayName} uploaded ${data.images.length} images.`;
    }

    setIsSubmitting(true);
    try {
      await createQREquipmentNote({
        equipmentId,
        organizationId,
        content: finalContent,
        images: data.images,
        isPrivate: data.isPrivate || false,
        machineHours: data.machineHours,
      });
      onSuccess('Note added to equipment.');
      resetAndClose();
    } catch (error) {
      logger.error('Failed to add QR equipment note', error);
      onError(error instanceof Error ? error.message : 'Unable to add note.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) resetAndClose(); }}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Note / Upload Image</DialogTitle>
          <DialogDescription>
            Attach field notes or images directly to {equipmentName}.
          </DialogDescription>
        </DialogHeader>

        <Card>
          <CardContent standalone>
            <InlineNoteComposer
              value={noteContent}
              onChange={setNoteContent}
              onSubmit={handleSubmit}
              attachedImages={attachedImages}
              onImagesAdd={(files) => setAttachedImages(prev => [...prev, ...files])}
              onImageRemove={(index) => setAttachedImages(prev => prev.filter((_, i) => i !== index))}
              showPrivateToggle
              showMachineHours
              disabled={isSubmitting}
              isSubmitting={isSubmitting}
              placeholder="Enter your equipment note..."
              userDisplayName={userDisplayName}
            />
          </CardContent>
        </Card>

        <Button type="button" variant="outline" onClick={resetAndClose} disabled={isSubmitting}>
          Close
        </Button>
      </DialogContent>
    </Dialog>
  );
};

export default QRNoteImageDialog;
