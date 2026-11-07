import React, { useId, useRef } from 'react';
import { useFileObjectUrlPreview } from '@/components/common/useFileObjectUrlPreview';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Image, X } from 'lucide-react';
import {
  validateAndAppendWorkOrderCreationImages,
  WORK_ORDER_CREATION_MAX_IMAGES,
} from '@/features/work-orders/utils/workOrderCreationImages';

const Thumbnail: React.FC<{
  file: File;
  onRemove: () => void;
  disabled?: boolean;
}> = ({ file, onRemove, disabled }) => {
  const previewUrl = useFileObjectUrlPreview(file);

  if (!previewUrl) return null;

  return (
    <div className="group relative shrink-0">
      <div className="relative h-16 w-16 overflow-hidden rounded-md border border-input bg-muted">
        <img src={previewUrl} alt={file.name} className="h-full w-full object-cover" />
        <Button
          type="button"
          variant="destructive"
          size="sm"
          onClick={onRemove}
          disabled={disabled}
          className="absolute -right-1 -top-1 h-5 w-5 rounded-full p-0"
          title="Remove image"
          aria-label={`Remove ${file.name}`}
        >
          <X className="h-3 w-3" aria-hidden />
        </Button>
      </div>
    </div>
  );
};

export interface WorkOrderCreationPhotoPickerProps {
  images: File[];
  onImagesChange: (files: File[]) => void;
  disabled?: boolean;
  /** Optional helper shown under the label. Limits are enforced on pick, so none by default. */
  description?: string;
}

/**
 * Shared creation-time photo picker (QR flow, full form, request form).
 */
const WorkOrderCreationPhotoPicker: React.FC<WorkOrderCreationPhotoPickerProps> = ({
  images,
  onImagesChange,
  disabled = false,
  description,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const generatedId = useId();
  const inputId = `${generatedId}-work-order-creation-photos`;
  const hintId = `${inputId}-hint`;
  const isFull = images.length >= WORK_ORDER_CREATION_MAX_IMAGES;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files || []);
    const next = validateAndAppendWorkOrderCreationImages(images, picked);
    onImagesChange(next);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label htmlFor={inputId} className="flex items-center gap-2">
          Photos
          <span className="text-xs font-normal tabular-nums text-muted-foreground">
            {images.length}/{WORK_ORDER_CREATION_MAX_IMAGES}
          </span>
        </Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1"
          disabled={disabled || isFull}
          onClick={() => inputRef.current?.click()}
        >
          <Image className="h-4 w-4" aria-hidden />
          Add photos
        </Button>
      </div>
      {description ? (
        <p id={hintId} className="text-xs text-muted-foreground">
          {description}
        </p>
      ) : null}
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        multiple
        className="sr-only"
        aria-describedby={description ? hintId : undefined}
        disabled={disabled || isFull}
        onChange={handleFileChange}
      />
      {images.length > 0 ? (
        <div className="flex flex-wrap gap-2 pt-1">
          {images.map((file, index) => (
            <Thumbnail
              key={`${file.name}-${file.size}-${index}`}
              file={file}
              disabled={disabled}
              onRemove={() => {
                const next = images.filter((_, i) => i !== index);
                onImagesChange(next);
              }}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
};

export default WorkOrderCreationPhotoPicker;
