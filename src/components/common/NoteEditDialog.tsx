import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { X } from 'lucide-react';
import { useAttachedNoteImages } from '@/hooks/useAttachedNoteImages';
import type { NoteTimelineImage } from '@/components/common/NoteTimelineEntry';

export interface NoteEditSubmitPayload {
  content: string;
  isPrivate: boolean;
  newImages: File[];
  removedImageIds: string[];
}

interface NoteEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialContent: string;
  initialIsPrivate: boolean;
  existingImages: NoteTimelineImage[];
  canToggleVisibility: boolean;
  canManageImages: boolean;
  isSubmitting?: boolean;
  onSubmit: (payload: NoteEditSubmitPayload) => Promise<void>;
}

const NoteEditDialog: React.FC<NoteEditDialogProps> = ({
  open,
  onOpenChange,
  initialContent,
  initialIsPrivate,
  existingImages,
  canToggleVisibility,
  canManageImages,
  isSubmitting = false,
  onSubmit,
}) => {
  const [content, setContent] = useState(initialContent);
  const [isPrivate, setIsPrivate] = useState(initialIsPrivate);
  const [removedImageIds, setRemovedImageIds] = useState<string[]>([]);
  const { attachedImages, handleImagesAdd, handleImageRemove, clearAttachedImages } =
    useAttachedNoteImages();

  React.useEffect(() => {
    if (open) {
      setContent(initialContent);
      setIsPrivate(initialIsPrivate);
      setRemovedImageIds([]);
      clearAttachedImages();
    }
  }, [open, initialContent, initialIsPrivate, clearAttachedImages]);

  const visibleExisting = existingImages.filter((img) => !removedImageIds.includes(img.id));

  const handleSubmit = async () => {
    await onSubmit({
      content: content.trim(),
      isPrivate,
      newImages: attachedImages,
      removedImageIds,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit note</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="note-edit-content">Note</Label>
            <Textarea
              id="note-edit-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={4}
              disabled={isSubmitting}
            />
          </div>

          {canToggleVisibility ? (
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="note-edit-private" className="cursor-pointer">
                Private note
              </Label>
              <Switch
                id="note-edit-private"
                checked={isPrivate}
                onCheckedChange={setIsPrivate}
                disabled={isSubmitting}
              />
            </div>
          ) : null}

          {canManageImages && visibleExisting.length > 0 ? (
            <div className="space-y-2">
              <Label>Attached images</Label>
              <div className="flex flex-wrap gap-2">
                {visibleExisting.map((image) => (
                  <div key={image.id} className="relative h-16 w-16 overflow-hidden rounded border">
                    <img src={image.file_url} alt={image.file_name} className="h-full w-full object-cover" />
                    <Button
                      type="button"
                      size="icon"
                      variant="destructive"
                      className="absolute -right-1 -top-1 h-5 w-5 rounded-full"
                      onClick={() => setRemovedImageIds((prev) => [...prev, image.id])}
                      disabled={isSubmitting}
                      aria-label={`Remove ${image.file_name}`}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {canManageImages ? (
            <div className="space-y-2">
              <Label htmlFor="note-edit-add-images">Add images</Label>
              <input
                id="note-edit-add-images"
                type="file"
                accept="image/*"
                multiple
                className="block w-full text-sm"
                disabled={isSubmitting}
                onChange={(e) => {
                  const files = Array.from(e.target.files ?? []);
                  if (files.length > 0) handleImagesAdd(files);
                  e.target.value = '';
                }}
              />
              {attachedImages.length > 0 ? (
                <p className="text-xs text-muted-foreground">{attachedImages.length} new image(s) selected</p>
              ) : null}
              {attachedImages.map((file, index) => (
                <div key={`${file.name}-${index}`} className="flex items-center justify-between text-xs">
                  <span className="truncate">{file.name}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleImageRemove(index)}
                    disabled={isSubmitting}
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="button" onClick={() => void handleSubmit()} disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : 'Save changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default NoteEditDialog;
