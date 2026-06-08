import React from 'react';
import { cn } from '@/lib/utils';
import { EQUIPMENT_STATUS_RAIL_LEGEND } from '@/lib/status-colors';

/**
 * Compact legend for equipment card left-rail status colors (filter popover).
 */
export function EquipmentStatusRailLegend() {
  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        Card rail color
      </p>
      <ul className="flex flex-wrap gap-x-3 gap-y-1.5" aria-label="Equipment status rail legend">
        {EQUIPMENT_STATUS_RAIL_LEGEND.map((item) => (
          <li key={item.status} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <span
              className={cn(
                'inline-block h-3.5 w-1 shrink-0 rounded-sm',
                item.railClass || 'rounded-full bg-muted-foreground/35',
              )}
              aria-hidden
            />
            <span>{item.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
