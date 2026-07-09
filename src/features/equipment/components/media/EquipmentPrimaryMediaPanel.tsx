import React from 'react';
import { EquipmentMediaCarousel } from '@/features/equipment/components/media/EquipmentMediaCarousel';
import { useEquipmentMediaLibrary } from '@/features/equipment/hooks/useEquipmentMediaLibrary';
import { cn } from '@/lib/utils';

interface EquipmentPrimaryMediaPanelProps {
  equipmentId: string;
  organizationId: string;
  equipmentName: string;
  currentDisplayImage?: string | null;
  className?: string;
  emptyClassName?: string;
  /** When false, skip the media query (e.g. missing ids). */
  enabled?: boolean;
}

/**
 * Fetches equipment media and renders the display-first chronological carousel
 * used on equipment details and work order equipment panels.
 */
export function EquipmentPrimaryMediaPanel({
  equipmentId,
  organizationId,
  equipmentName,
  currentDisplayImage,
  className,
  emptyClassName,
  enabled = true,
}: EquipmentPrimaryMediaPanelProps) {
  const { displayOrderedImages, isLoading } = useEquipmentMediaLibrary({
    equipmentId,
    organizationId,
    currentDisplayImage,
    enabled: enabled && !!equipmentId && !!organizationId,
  });

  if (isLoading) {
    return (
      <div
        className={cn('animate-pulse rounded-lg bg-muted', emptyClassName ?? 'h-64', className)}
        aria-busy="true"
        aria-label={`Loading photos for ${equipmentName}`}
      />
    );
  }

  return (
    <EquipmentMediaCarousel
      images={displayOrderedImages}
      currentDisplayImage={currentDisplayImage}
      equipmentName={equipmentName}
      className={className}
      emptyClassName={emptyClassName}
    />
  );
}
