import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Image, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { logger } from '@/utils/logger';

// Image Thumbnail Component with proper cleanup
const ImageThumbnail: React.FC<{
  file: File;
  onRemove: () => void;
  disabled?: boolean;
}> = ({ file, onRemove, disabled }) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [file]);

  if (!previewUrl) return null;

  return (
    <div className="relative flex-shrink-0 group">
      <div className="relative w-16 h-16 rounded-md overflow-hidden border border-input bg-muted">
        <img
          src={previewUrl}
          alt={file.name}
          className="w-full h-full object-cover"
        />
        <Button
          type="button"
          variant="destructive"
          size="sm"
          onClick={onRemove}
          disabled={disabled}
          className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 opacity-0 group-hover:opacity-100 transition-opacity"
          title="Remove image"
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
};

export interface InlineNoteComposerProps {
  /** Note text value */
  value: string;
  /** Callback when note text changes */
  onChange: (value: string) => void;
  /** Callback when form is submitted */
  onSubmit: (data: {
    content: string;
    images: File[];
    hoursWorked?: number;
    machineHours?: number;
    isPrivate?: boolean;
  }) => Promise<void> | void;
  /** Currently attached images */
  attachedImages?: File[];
  /** Callback when images are added */
  onImagesAdd?: (files: File[]) => void;
  /** Callback when an image is removed */
  onImageRemove?: (index: number) => void;
  /** Whether private note toggle should be shown */
  showPrivateToggle?: boolean;
  /** Whether hours worked input should be shown */
  showHoursWorked?: boolean;
  /** Whether machine hours input should be shown */
  showMachineHours?: boolean;
  /** Whether the form is disabled */
  disabled?: boolean;
  /** Whether the form is submitting */
  isSubmitting?: boolean;
  /** Placeholder text for the textarea */
  placeholder?: string;
  /** Maximum number of images allowed */
  maxImages?: number;
  /** Accepted image file types */
  acceptedImageTypes?: string[];
  /** Maximum file size in bytes (default: 10MB) */
  maxFileSize?: number;
  /** User display name for fallback message when pasting images without text */
  userDisplayName?: string;
}

const InlineNoteComposer: React.FC<InlineNoteComposerProps> = ({
  value,
  onChange,
  onSubmit,
  attachedImages = [],
  onImagesAdd,
  onImageRemove,
  showPrivateToggle = false,
  showHoursWorked = false,
  showMachineHours = false,
  disabled = false,
  isSubmitting = false,
  placeholder = 'Write a note...',
  maxImages = 5,
  acceptedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  maxFileSize = 10 * 1024 * 1024, // 10MB
  userDisplayName,
}) => {
  const [hoursWorked, setHoursWorked] = useState<number>(0);
  const [machineHours, setMachineHours] = useState<number>(0);
  const [isPrivate, setIsPrivate] = useState<boolean>(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleFilesAdd = useCallback((files: File[]) => {
    const validFiles: File[] = [];
    
    for (const file of files) {
      // Check file type
      if (!acceptedImageTypes.includes(file.type)) {
        toast.error(`${file.name} is not a supported image format`);
        continue;
      }
      
      // Check file size
      if (file.size > maxFileSize) {
        toast.error(`${file.name} is too large. Maximum size is ${(maxFileSize / 1024 / 1024).toFixed(0)}MB`);
        continue;
      }
      
      validFiles.push(file);
    }

    if (validFiles.length === 0) return;

    const totalFiles = attachedImages.length + validFiles.length;
    if (totalFiles > maxImages) {
      toast.error(`Maximum ${maxImages} images allowed`);
      return;
    }

    onImagesAdd?.(validFiles);
  }, [attachedImages.length, maxImages, acceptedImageTypes, maxFileSize, onImagesAdd]);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    handleFilesAdd(files);
    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [handleFilesAdd]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const files = Array.from(e.dataTransfer.files);
    handleFilesAdd(files);
  }, [handleFilesAdd]);

  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    // Don't process paste when disabled
    if (disabled || isSubmitting) return;

    const clipboardData = e.clipboardData;
    if (!clipboardData) return;

    // Extract image files from clipboard
    const imageFiles: File[] = [];
    for (let i = 0; i < clipboardData.items.length; i++) {
      const item = clipboardData.items[i];
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          // Normalize filename for clipboard images (often have empty or generic names)
          const normalizedFile = file.name && file.name !== 'image.png'
            ? file
            : new File([file], `pasted-image-${Date.now()}.${file.type.split('/')[1] || 'png'}`, { type: file.type });
          imageFiles.push(normalizedFile);
        }
      }
    }

    // If no images in clipboard, allow default text paste
    if (imageFiles.length === 0) return;

    // Prevent default paste behavior when images are present
    e.preventDefault();

    // Extract text from clipboard
    const pastedText = clipboardData.getData('text/plain');

    // Add images via existing handler (validates type, size, maxImages)
    handleFilesAdd(imageFiles);

    // Handle text content
    if (pastedText) {
      // Append text with proper line break if needed
      const separator = value && !value.endsWith('\n') ? '\n' : '';
      onChange(value + separator + pastedText);
    } else if (userDisplayName) {
      // Generate fallback string when pasting images only (no text)
      const imageCount = imageFiles.length;
      const timestamp = new Date().toISOString();
      const fallbackText = imageCount === 1
        ? `1 image uploaded on ${timestamp} by ${userDisplayName}`
        : `${imageCount} images uploaded on ${timestamp} by ${userDisplayName}`;
      
      // Only set fallback if note is currently empty
      if (!value.trim()) {
        onChange(fallbackText);
      }
    }
  }, [disabled, isSubmitting, handleFilesAdd, value, onChange, userDisplayName]);

  const handleRemoveImage = useCallback((index: number) => {
    onImageRemove?.(index);
  }, [onImageRemove]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate that either content or images are provided
    if (!value.trim() && attachedImages.length === 0) {
      toast.error('Please enter note content or attach images');
      return;
    }

    try {
      await onSubmit({
        content: value.trim(),
        images: attachedImages,
        hoursWorked: showHoursWorked ? hoursWorked : undefined,
        machineHours: showMachineHours ? machineHours : undefined,
        isPrivate: showPrivateToggle ? isPrivate : undefined,
      });
      
      // Reset form after successful submit
      setHoursWorked(0);
      setMachineHours(0);
      setIsPrivate(false);
    } catch (error) {
      // Error handling is done by parent component
      logger.error('Failed to submit note', error);
    }
  }, [value, attachedImages, hoursWorked, machineHours, isPrivate, showHoursWorked, showMachineHours, showPrivateToggle, onSubmit]);

  const handleAttachClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {/* Text Input Area */}
      <div
        className={cn(
          'relative rounded-lg border border-input bg-background transition-colors',
          dragActive && 'border-primary bg-primary/5',
          disabled && 'opacity-50'
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onPaste={handlePaste}
          placeholder={placeholder}
          disabled={disabled || isSubmitting}
          rows={3}
          className="min-h-[80px] resize-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0 pr-20"
          aria-label="Note content"
        />
        
        {/* Attach Images Button */}
        <div className="absolute bottom-2 right-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleAttachClick}
            disabled={disabled || isSubmitting || attachedImages.length >= maxImages}
            className="h-8 w-8 p-0"
            title="Attach images"
            aria-label="Attach images"
          >
            <Image className="h-4 w-4" />
          </Button>
        </div>
        
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={acceptedImageTypes.join(',')}
          onChange={handleFileSelect}
          disabled={disabled || isSubmitting}
          className="hidden"
        />
      </div>

      {/* Image Thumbnails */}
      {attachedImages.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {attachedImages.map((file, index) => (
            <ImageThumbnail
              key={`${file.name}-${file.size}-${file.lastModified}`}
              file={file}
              onRemove={() => handleRemoveImage(index)}
              disabled={disabled || isSubmitting}
            />
          ))}
        </div>
      )}

      {/* Optional Fields Row */}
      {(showHoursWorked || showMachineHours || showPrivateToggle) && (
        <div className="flex flex-wrap items-center gap-3 text-sm">
          {showHoursWorked && (
            <div className="flex items-center gap-2">
              <Label htmlFor="hours-worked" className="text-xs text-muted-foreground whitespace-nowrap">
                Hours Worked:
              </Label>
              <Input
                id="hours-worked"
                type="number"
                min="0"
                step="0.5"
                value={hoursWorked || ''}
                onChange={(e) => setHoursWorked(parseFloat(e.target.value) || 0)}
                disabled={disabled || isSubmitting}
                className="h-8 w-20"
              />
            </div>
          )}
          
          {showMachineHours && (
            <div className="flex items-center gap-2">
              <Label htmlFor="machine-hours" className="text-xs text-muted-foreground whitespace-nowrap">
                Machine Hours:
              </Label>
              <Input
                id="machine-hours"
                type="number"
                min="0"
                step="0.5"
                value={machineHours || ''}
                onChange={(e) => setMachineHours(parseFloat(e.target.value) || 0)}
                disabled={disabled || isSubmitting}
                className="h-8 w-20"
              />
            </div>
          )}
          
          {showPrivateToggle && (
            <div className="flex items-center gap-2">
              <Switch
                id="private-note"
                checked={isPrivate}
                onCheckedChange={setIsPrivate}
                disabled={disabled || isSubmitting}
              />
              <Label htmlFor="private-note" className="text-xs text-muted-foreground cursor-pointer">
                Private
              </Label>
            </div>
          )}
        </div>
      )}

      {/* Submit Button */}
      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={disabled || isSubmitting || (!value.trim() && attachedImages.length === 0)}
          size="sm"
        >
          {isSubmitting ? 'Adding...' : 'Add Note'}
        </Button>
      </div>
    </form>
  );
};

export default InlineNoteComposer;

