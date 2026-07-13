import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Images } from 'lucide-react';
import type { EquipmentImageData } from '@/features/equipment/services/equipmentImagesService';
import { displayableImageSrc } from '@/services/imageUploadService';
import { cn } from '@/lib/utils';

interface EquipmentMediaSummaryStripProps {
  images: EquipmentImageData[];
  totalCount: number;
  equipmentName: string;
  isLoading?: boolean;
  onOpenExplorer: () => void;
  className?: string;
}

export function EquipmentMediaSummaryStrip({
  images,
  totalCount,
  equipmentName,
  isLoading = false,
  onOpenExplorer,
  className,
}: EquipmentMediaSummaryStripProps) {
  const thumbs = images.slice(0, 4);

  return (
    <div
      className={cn(
        'flex flex-col gap-2 rounded-lg border bg-card p-3 sm:flex-row sm:items-center sm:justify-between',
        className,
      )}
      data-testid="equipment-media-summary"
    >
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex -space-x-2" aria-hidden={thumbs.length === 0}>
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-10 w-10 animate-pulse rounded-md border-2 border-background bg-muted"
              />
            ))
          ) : thumbs.length > 0 ? (
            thumbs.map((image) => {
              const src = displayableImageSrc(image.file_url);
              return (
                <div
                  key={image.id}
                  className="h-10 w-10 overflow-hidden rounded-md border-2 border-background bg-muted"
                >
                  {src ? (
                    <img
                      src={src}
                      alt=""
                      className="h-full w-full object-cover"
                      loading="lazy"
                      decoding="async"
                    />
                  ) : null}
                </div>
              );
            })
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-md border bg-muted">
              <Images className="h-4 w-4 text-muted-foreground" aria-hidden />
            </div>
          )}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium">Media & artifacts</p>
            <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
              {isLoading ? '…' : totalCount}
            </Badge>
          </div>
          <p className="truncate text-xs text-muted-foreground">
            {totalCount === 0
              ? `No photos yet for ${equipmentName}`
              : 'Notes, work orders, and display image'}
          </p>
        </div>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8 shrink-0"
        onClick={onOpenExplorer}
        aria-label={`View all media for ${equipmentName}`}
      >
        <Images className="mr-1.5 h-3.5 w-3.5" aria-hidden />
        View all media
      </Button>
    </div>
  );
}
