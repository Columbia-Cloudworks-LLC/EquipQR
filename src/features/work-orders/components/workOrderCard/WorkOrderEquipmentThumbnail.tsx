import React, { useState } from 'react';
import {
  getWorkOrderEquipmentFallbackIcon,
  getWorkOrderEquipmentFallbackTint,
} from '@/features/work-orders/utils/workOrderEquipmentVisuals';
import { cn } from '@/lib/utils';

export interface EquipmentThumbnailProps {
  imageUrl?: string | null;
  equipmentName?: string;
  equipmentAltContext?: string;
  className?: string;
  iconClassName?: string;
  isAboveTheFold?: boolean;
}

/**
 * Canonical private-bucket paths (e.g. `{userId}/{workOrderId}/{file}.jpg`)
 * must never reach `<img src>` — the browser resolves them relative to the
 * current SPA route and requests a nonexistent /dashboard/... URL (#1086).
 */
function isRenderableImageUrl(imageUrl: string | null | undefined): imageUrl is string {
  return Boolean(imageUrl && /^(https?:|blob:|data:|\/)/i.test(imageUrl));
}

export const WorkOrderEquipmentThumbnail: React.FC<EquipmentThumbnailProps> = ({
  imageUrl,
  equipmentName,
  equipmentAltContext,
  className,
  iconClassName,
  isAboveTheFold = false,
}) => {
  const [hasImageError, setHasImageError] = useState(false);

  if (!isRenderableImageUrl(imageUrl) || hasImageError) {
    const FallbackIcon = getWorkOrderEquipmentFallbackIcon(equipmentName ?? equipmentAltContext);
    const tintClass = getWorkOrderEquipmentFallbackTint(equipmentName ?? equipmentAltContext);
    return (
      <div className={cn('rounded-xl flex items-center justify-center ring-1 ring-border', tintClass, className)}>
        <FallbackIcon className={cn('text-muted-foreground', iconClassName)} />
      </div>
    );
  }

  return (
    <img
      src={imageUrl}
      alt={
        equipmentName
          ? `${equipmentName} equipment image`
          : equipmentAltContext
            ? `${equipmentAltContext} equipment image`
            : 'Work order equipment image'
      }
      className={cn('rounded-xl object-cover bg-muted ring-1 ring-border', className)}
      loading={isAboveTheFold ? 'eager' : 'lazy'}
      fetchPriority={isAboveTheFold ? 'high' : 'auto'}
      onError={() => setHasImageError(true)}
    />
  );
};
