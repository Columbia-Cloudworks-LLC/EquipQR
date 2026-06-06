import React, { useState } from 'react';
import {
  formatWorkOrderMachineHours,
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

export const WorkOrderEquipmentThumbnail: React.FC<EquipmentThumbnailProps> = ({
  imageUrl,
  equipmentName,
  equipmentAltContext,
  className,
  iconClassName,
  isAboveTheFold = false,
}) => {
  const [hasImageError, setHasImageError] = useState(false);

  if (!imageUrl || hasImageError) {
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
