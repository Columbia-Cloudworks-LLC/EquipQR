import * as React from 'react';

import { cn } from '@/lib/utils';
import { getStatusDisplayInfo } from '@/features/equipment/utils/equipmentHelpers';

export type DotStatusValue = 'active' | 'maintenance' | 'inactive' | 'out_of_service';

export interface DotStatusProps {
  status: DotStatusValue | string;
  /** When true, the status label renders visibly next to the dot. Always exposed to AT regardless. */
  showLabel?: boolean;
  className?: string;
}

const dotColorClass = (status: string): string => {
  switch (status) {
    case 'active':
      return 'bg-success';
    case 'maintenance':
    case 'out_of_service':
      return 'bg-warning';
    case 'inactive':
      return 'bg-muted-foreground';
    default:
      return 'bg-muted-foreground';
  }
};

/**
 * Compact status indicator for high-density tables.
 *
 * Renders a colored dot using the existing equipment status palette and a
 * label that is always available to assistive tech. Sighted users get the
 * label visibly when `showLabel` is set, and via the native `title` tooltip
 * otherwise.
 */
export const DotStatus: React.FC<DotStatusProps> = ({ status, showLabel = false, className }) => {
  const { label } = getStatusDisplayInfo(status);

  return (
    <span
      className={cn('inline-flex items-center gap-2', className)}
      title={showLabel ? undefined : label}
    >
      <span
        aria-hidden="true"
        className={cn('inline-block size-2 rounded-full', dotColorClass(status))}
      />
      {showLabel ? (
        <span className="text-xs text-muted-foreground">{label}</span>
      ) : (
        <span className="sr-only">{label}</span>
      )}
    </span>
  );
};

export default DotStatus;
