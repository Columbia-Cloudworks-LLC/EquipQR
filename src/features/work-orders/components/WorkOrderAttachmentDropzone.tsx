import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Paperclip, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFileObjectUrlPreview } from '@/components/common/useFileObjectUrlPreview';
import { handleDragActiveState } from '@/components/common/drag-active-handlers';
import { cn } from '@/lib/utils';
import {
  extractPastedImages,
  validateAndAppendWorkOrderCreationImages,
  WORK_ORDER_CREATION_IMAGE_TYPES,
  WORK_ORDER_CREATION_MAX_IMAGES,
} from '@/features/work-orders/utils/workOrderCreationImages';

const Thumbnail: React.FC<{ file: File; onRemove: () => void; disabled?: boolean }> = ({
  file,
  onRemove,
  disabled,
}) => {
  const previewUrl = useFileObjectUrlPreview(file);
  if (!previewUrl) return null;

  return (
    <div className="relative shrink-0">
      <img
        src={previewUrl}
        alt={file.name}
        className="h-12 w-12 rounded-md border border-input bg-muted object-cover"
      />
      <Button
        type="button"
        variant="destructive"
        size="sm"
        onClick={onRemove}
        disabled={disabled}
        className="absolute -right-1.5 -top-1.5 h-5 w-5 rounded-full p-0"
        aria-label={`Remove ${file.name}`}
      >
        <X className="h-3 w-3" aria-hidden />
      </Button>
    </div>
  );
};

interface WorkOrderAttachmentDropzoneProps {
  images: File[];
  onImagesChange: (files: File[]) => void;
  disabled?: boolean;
  /** Button text, e.g. "Attach Paper Sheet / Photo". */
  label?: string;
  /**
   * Listen for Ctrl/Cmd+V on the whole document while mounted, so a screenshot
   * or scan can be pasted without first clicking the drop area.
   */
  captureDocumentPaste?: boolean;
}

/**
 * Compact attachment control for work order creation: one row that accepts a
 * click, a drag-and-drop, or a clipboard paste. It only grows when files are
 * staged, so it never pushes the form down while empty.
 */
export const WorkOrderAttachmentDropzone: React.FC<WorkOrderAttachmentDropzoneProps> = ({
  images,
  onImagesChange,
  disabled = false,
  label = 'Attach Photo',
  captureDocumentPaste = false,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = `${useId()}-work-order-attachments`;
  const [dragActive, setDragActive] = useState(false);
  const isFull = images.length >= WORK_ORDER_CREATION_MAX_IMAGES;
  const imagesRef = useRef(images);
  imagesRef.current = images;

  const addFiles = useCallback(
    (incoming: File[]) => {
      if (incoming.length === 0) return;
      onImagesChange(validateAndAppendWorkOrderCreationImages(imagesRef.current, incoming));
    },
    [onImagesChange],
  );

  useEffect(() => {
    if (!captureDocumentPaste || disabled) return;

    const handlePaste = (event: ClipboardEvent) => {
      const pasted = extractPastedImages(event.clipboardData);
      if (pasted.length === 0) return;
      event.preventDefault();
      addFiles(pasted);
    };

    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [captureDocumentPaste, disabled, addFiles]);

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);
    if (disabled) return;
    addFiles(Array.from(event.dataTransfer.files));
  };

  return (
    <div
      className={cn(
        'rounded-lg border border-dashed border-input bg-background px-2.5 py-2 transition-colors',
        dragActive && 'border-primary bg-primary/5',
        disabled && 'opacity-60',
      )}
      onDragEnter={(event) => handleDragActiveState(event, setDragActive)}
      onDragOver={(event) => handleDragActiveState(event, setDragActive)}
      onDragLeave={(event) => handleDragActiveState(event, setDragActive)}
      onDrop={handleDrop}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 px-2"
          disabled={disabled || isFull}
          onClick={() => inputRef.current?.click()}
        >
          <Paperclip className="h-4 w-4" aria-hidden />
          {label}
        </Button>
        <span className="text-xs text-muted-foreground">
          {dragActive
            ? 'Drop to attach'
            : `Drop, paste (Ctrl+V), or click · ${images.length}/${WORK_ORDER_CREATION_MAX_IMAGES}`}
        </span>
      </div>
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={WORK_ORDER_CREATION_IMAGE_TYPES.join(',')}
        multiple
        className="sr-only"
        aria-label={label}
        disabled={disabled || isFull}
        onChange={(event) => {
          addFiles(Array.from(event.target.files || []));
          if (inputRef.current) inputRef.current.value = '';
        }}
      />
      {images.length > 0 ? (
        <div className="flex flex-wrap gap-2 px-1 pb-1 pt-2">
          {images.map((file, index) => (
            <Thumbnail
              key={`${file.name}-${file.size}-${index}`}
              file={file}
              disabled={disabled}
              onRemove={() => onImagesChange(images.filter((_, i) => i !== index))}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
};
