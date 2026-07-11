import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Star } from 'lucide-react';
import DynamicImageViewport from '@/components/common/DynamicImageViewport';
import { EquipmentMediaFiltersBar } from '@/features/equipment/components/media/EquipmentMediaFiltersBar';
import type { EquipmentImageData } from '@/features/equipment/services/equipmentImagesService';
import {
  isEquipmentDisplayImage,
  resolveEquipmentMediaArtifactKind,
  type EquipmentMediaFiltersState,
} from '@/features/equipment/utils/equipmentMediaFilters';
import type { EquipmentMediaFilterHandlers } from '@/features/equipment/components/media/equipmentMediaFilterHandlers';
import { displayableImageSrc } from '@/services/imageUploadService';
import { useFormatTimestamp } from '@/hooks/useFormatTimestamp';
import { cn } from '@/lib/utils';

interface EquipmentMediaExplorerProps extends EquipmentMediaFilterHandlers {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  equipmentName: string;
  images: EquipmentImageData[];
  filteredImages: EquipmentImageData[];
  filters: EquipmentMediaFiltersState;
  activeFilterCount: number;
  isLoading?: boolean;
  currentDisplayImage?: string | null;
  canSetDisplayImage?: boolean;
  onClearFilters: () => void;
  onSetDisplayImage?: (imageUrl: string) => Promise<void>;
}

function sourceLabel(source: EquipmentImageData['source_type']): string {
  return source === 'equipment_note' ? 'Equipment note' : 'Work order';
}

export function EquipmentMediaExplorer({
  open,
  onOpenChange,
  equipmentName,
  images,
  filteredImages,
  filters,
  activeFilterCount,
  isLoading = false,
  currentDisplayImage,
  canSetDisplayImage = false,
  onSearchChange,
  onSourceChange,
  onUploaderChange,
  onDateFromChange,
  onDateToChange,
  onSortChange,
  onClearFilters,
  onSetDisplayImage,
}: EquipmentMediaExplorerProps) {
  const { formatDateTime } = useFormatTimestamp();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected =
    filteredImages.find((image) => image.id === selectedId) ?? filteredImages[0] ?? null;

  const selectedKind = selected
    ? resolveEquipmentMediaArtifactKind(undefined, selected.file_name)
    : 'image';
  const selectedSrc = selected ? displayableImageSrc(selected.file_url) : null;
  const selectedIsDisplay = selected
    ? isEquipmentDisplayImage(selected, currentDisplayImage)
    : false;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[calc(100dvh-1.5rem)] w-[calc(100vw-1rem)] max-w-5xl flex-col gap-3 overflow-hidden p-3 sm:p-4">
        <DialogHeader className="space-y-1 text-left">
          <DialogTitle className="text-base sm:text-lg">
            Media & artifacts — {equipmentName}
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            Search and filter photos from equipment notes and work order history.
            {images.length > 0 ? ` ${images.length} total.` : ''}
          </DialogDescription>
        </DialogHeader>

        <EquipmentMediaFiltersBar
          filters={filters}
          activeFilterCount={activeFilterCount}
          onSearchChange={onSearchChange}
          onSourceChange={onSourceChange}
          onUploaderChange={onUploaderChange}
          onDateFromChange={onDateFromChange}
          onDateToChange={onDateToChange}
          onSortChange={onSortChange}
          onClear={onClearFilters}
        />

        <div className="grid min-h-0 flex-1 gap-3 overflow-hidden lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          <div className="min-h-0 overflow-y-auto rounded-lg border p-2">
            {isLoading ? (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="aspect-square animate-pulse rounded-md bg-muted" />
                ))}
              </div>
            ) : filteredImages.length === 0 ? (
              <div className="flex h-40 flex-col items-center justify-center gap-1 px-4 text-center">
                <p className="text-sm font-medium">No media match</p>
                <p className="text-xs text-muted-foreground">
                  Adjust filters or upload photos from the Images tab.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {filteredImages.map((image) => {
                  const src = displayableImageSrc(image.file_url);
                  const kind = resolveEquipmentMediaArtifactKind(undefined, image.file_name);
                  const isDisplay = isEquipmentDisplayImage(image, currentDisplayImage);
                  const isSelected = selected?.id === image.id;
                  return (
                    <button
                      key={image.id}
                      type="button"
                      onClick={() => setSelectedId(image.id)}
                      className={cn(
                        'group relative aspect-square overflow-hidden rounded-md border bg-muted text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        isSelected && 'ring-2 ring-primary',
                      )}
                      aria-label={`Preview ${image.file_name}`}
                      aria-pressed={isSelected}
                    >
                      {kind === 'image' && src ? (
                        <img
                          src={src}
                          alt=""
                          className="h-full w-full object-cover transition-transform group-hover:scale-[1.03]"
                          loading="lazy"
                          decoding="async"
                        />
                      ) : (
                        <div className="flex h-full w-full flex-col items-center justify-center gap-1 p-2">
                          <FileText className="h-6 w-6 text-muted-foreground" aria-hidden />
                          <span className="line-clamp-2 text-center text-[10px] text-muted-foreground">
                            {image.file_name}
                          </span>
                        </div>
                      )}
                      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-gradient-to-t from-black/70 to-transparent p-1.5">
                        <Badge variant="secondary" className="h-4 max-w-[70%] truncate px-1 text-[9px]">
                          {sourceLabel(image.source_type)}
                        </Badge>
                        {isDisplay ? (
                          <Star className="h-3 w-3 fill-amber-400 text-amber-400" aria-label="Display image" />
                        ) : null}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="hidden min-h-0 flex-col gap-2 overflow-y-auto rounded-lg border p-2 lg:flex">
            {selected && selectedKind === 'image' && selectedSrc ? (
              <>
                <DynamicImageViewport
                  src={selectedSrc}
                  alt={selected.file_name}
                  fileName={selected.file_name}
                  className="aspect-[4/3] w-full rounded-md"
                />
                <div className="space-y-1 px-0.5">
                  <p className="truncate text-sm font-medium">{selected.file_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {sourceLabel(selected.source_type)}
                    {selected.uploaded_by_name ? ` · ${selected.uploaded_by_name}` : ''}
                    {selected.created_at
                      ? ` · ${formatDateTime(selected.created_at)}`
                      : ''}
                  </p>
                  {selected.note_content ? (
                    <p className="line-clamp-3 text-xs text-muted-foreground">{selected.note_content}</p>
                  ) : null}
                  {canSetDisplayImage && onSetDisplayImage ? (
                    <Button
                      type="button"
                      size="sm"
                      variant={selectedIsDisplay ? 'secondary' : 'outline'}
                      className="mt-1 h-8"
                      disabled={selectedIsDisplay}
                      onClick={() => void onSetDisplayImage(selected.file_url)}
                    >
                      <Star className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                      {selectedIsDisplay ? 'Current display image' : 'Set as display image'}
                    </Button>
                  ) : null}
                </div>
              </>
            ) : selected && selectedKind !== 'image' ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
                <FileText className="h-10 w-10 text-muted-foreground" aria-hidden />
                <p className="text-sm font-medium">{selected.file_name}</p>
                <p className="text-xs text-muted-foreground">
                  Document preview is not available yet. Download from the linked note when needed.
                </p>
              </div>
            ) : (
              <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-muted-foreground">
                Select a media item to preview
              </div>
            )}
          </div>
        </div>

        {/* Mobile preview: selected item viewport below grid */}
        {selected && selectedKind === 'image' && selectedSrc ? (
          <div className="space-y-2 border-t pt-2 lg:hidden">
            <DynamicImageViewport
              src={selectedSrc}
              alt={selected.file_name}
              fileName={selected.file_name}
              className="aspect-square w-full rounded-md sm:aspect-[4/3]"
            />
            {canSetDisplayImage && onSetDisplayImage ? (
              <Button
                type="button"
                size="sm"
                variant={selectedIsDisplay ? 'secondary' : 'outline'}
                className="h-8 w-full"
                disabled={selectedIsDisplay}
                onClick={() => void onSetDisplayImage(selected.file_url)}
              >
                <Star className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                {selectedIsDisplay ? 'Current display image' : 'Set as display image'}
              </Button>
            ) : null}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
