import React from 'react';
import { Pin, PinOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WorkOrderPinToggleProps {
  /** Field name used in the accessible label, e.g. "Equipment". */
  field: string;
  pinned: boolean;
  onPinnedChange: (pinned: boolean) => void;
}

/** Rapid entry: keep this field's value for the next work order. */
export const WorkOrderPinToggle: React.FC<WorkOrderPinToggleProps> = ({
  field,
  pinned,
  onPinnedChange,
}) => (
  <button
    type="button"
    aria-pressed={pinned}
    aria-label={pinned ? `Unpin ${field}` : `Pin ${field} for the next work order`}
    title={pinned ? `${field} is kept for the next work order` : `Keep ${field} for the next work order`}
    onClick={() => onPinnedChange(!pinned)}
    className={cn(
      'inline-flex h-6 w-6 items-center justify-center rounded-md transition-colors',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
      pinned
        ? 'bg-primary/15 text-primary'
        : 'text-muted-foreground/70 hover:bg-muted hover:text-foreground',
    )}
  >
    {pinned ? <Pin className="h-3.5 w-3.5 fill-current" aria-hidden /> : <PinOff className="h-3.5 w-3.5" aria-hidden />}
  </button>
);
