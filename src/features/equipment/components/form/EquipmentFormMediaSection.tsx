import React, { useEffect, useRef, useState } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Camera, ImagePlus, Star, X } from 'lucide-react';
import { toast } from 'sonner';
import type { EquipmentFormData } from '@/features/equipment/types/equipment';
import { useLocalFilePreviewUrls } from '@/hooks/useLocalFilePreviewUrls';
import { cn } from '@/lib/utils';

export type EquipmentFormPendingMedia = {
  files: File[];
  displayIndex: number;
};

interface EquipmentFormMediaSectionProps {
  form: UseFormReturn<EquipmentFormData>;
  /** Called whenever pending local files / display selection change (create flow). */
  onPendingMediaChange: (media: EquipmentFormPendingMedia) => void;
  disabled?: boolean;
}

/**
 * Create-time display image capture: pick from device/camera, multi-select,
 * choose which becomes the equipment display image after create.
 */
export function EquipmentFormMediaSection({
  form,
  onPendingMediaChange,
  disabled = false,
}: EquipmentFormMediaSectionProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [displayIndex, setDisplayIndex] = useState(0);
  const { getPreviewUrl, revokePreviewUrl } = useLocalFilePreviewUrls();
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    onPendingMediaChange({ files, displayIndex });
  }, [files, displayIndex, onPendingMediaChange]);

  // Keep form image_url empty until post-create upload resolves a storage path.
  useEffect(() => {
    if (form.getValues('image_url')) {
      form.setValue('image_url', '');
    }
  }, [form]);

  const addFiles = (incoming: File[]) => {
    const accepted = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    const valid = incoming.filter((file) => {
      if (!accepted.includes(file.type)) {
        toast.error(`${file.name} is not a supported image format`);
        return false;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} is too large (max 10MB)`);
        return false;
      }
      return true;
    });
    setFiles((prev) => {
      const next = [...prev, ...valid].slice(0, 5);
      if (displayIndex >= next.length) setDisplayIndex(0);
      return next;
    });
  };

  const removeFile = (index: number) => {
    setFiles((prev) => {
      const removed = prev[index];
      if (removed) revokePreviewUrl(removed);
      const next = prev.filter((_, i) => i !== index);
      setDisplayIndex((current) => {
        if (next.length === 0) return 0;
        if (index === current) return 0;
        if (index < current) return Math.max(0, current - 1);
        return current;
      });
      return next;
    });
  };

  return (
    <Card>
      <CardContent className="space-y-3 pt-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
              Display image
            </h3>
            <p className="text-xs text-muted-foreground">
              Optional. Upload photos now and pick which becomes the primary display image.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8"
            disabled={disabled || files.length >= 5}
            onClick={() => fileInputRef.current?.click()}
          >
            <ImagePlus className="mr-1.5 h-3.5 w-3.5" aria-hidden />
            From device
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8"
            disabled={disabled || files.length >= 5}
            onClick={() => cameraInputRef.current?.click()}
          >
            <Camera className="mr-1.5 h-3.5 w-3.5" aria-hidden />
            Camera
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            multiple
            className="hidden"
            onChange={(e) => {
              addFiles(Array.from(e.target.files ?? []));
              e.target.value = '';
            }}
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              addFiles(Array.from(e.target.files ?? []));
              e.target.value = '';
            }}
          />
        </div>

        {files.length > 0 ? (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {files.map((file, index) => {
              const preview = getPreviewUrl(file);
              const isDisplay = index === displayIndex;
              return (
                <div
                  key={`${file.name}-${file.size}-${index}`}
                  className={cn(
                    'group relative aspect-square overflow-hidden rounded-md border bg-muted',
                    isDisplay && 'ring-2 ring-primary',
                  )}
                >
                  {preview ? (
                    <img src={preview} alt="" className="h-full w-full object-cover" />
                  ) : null}
                  <div className="absolute inset-x-0 bottom-0 flex gap-1 bg-black/50 p-1">
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 text-white hover:bg-white/20"
                      aria-label={isDisplay ? 'Selected display image' : 'Set as display image'}
                      onClick={() => setDisplayIndex(index)}
                    >
                      <Star
                        className={cn('h-3 w-3', isDisplay && 'fill-amber-400 text-amber-400')}
                        aria-hidden
                      />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="ml-auto h-6 w-6 text-white hover:bg-white/20"
                      aria-label={`Remove ${file.name}`}
                      onClick={() => removeFile(index)}
                    >
                      <X className="h-3 w-3" aria-hidden />
                    </Button>
                  </div>
                  {isDisplay ? (
                    <Label className="absolute left-1 top-1 rounded bg-primary px-1 text-[9px] text-primary-foreground">
                      Display
                    </Label>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">No photos selected yet.</p>
        )}
      </CardContent>
    </Card>
  );
}
