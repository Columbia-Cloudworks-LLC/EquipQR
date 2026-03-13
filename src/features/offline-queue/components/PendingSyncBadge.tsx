import React from 'react';
import { Badge } from '@/components/ui/badge';
import { CloudOff } from 'lucide-react';

interface PendingSyncBadgeProps {
  className?: string;
}

/**
 * Small badge that indicates an item was created offline and is waiting to sync.
 * Used inline on WorkOrderCard and EquipmentCard for queued items.
 */
export const PendingSyncBadge: React.FC<PendingSyncBadgeProps> = ({ className }) => {
  return (
    <Badge
      variant="outline"
      className={`gap-1 text-xs border-warning/200/50 text-warning dark:text-warning bg-warning/10 dark:bg-warning/15 ${className ?? ''}`}
    >
      <CloudOff className="h-3 w-3" />
      Pending sync
    </Badge>
  );
};

