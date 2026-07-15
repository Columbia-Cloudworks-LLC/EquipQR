import React from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { VerificationStatus } from '@/features/inventory/types/inventory';

const STATUS_CONFIG: Record<
  VerificationStatus,
  { label: string; description: string; dotClassName: string }
> = {
  verified: {
    label: 'Verified',
    description:
      'Interchangeability confirmed with evidence. Shown with higher priority in search results.',
    dotClassName: 'bg-success',
  },
  unverified: {
    label: 'Unverified',
    description:
      'Not yet confirmed. Add evidence and part numbers, then mark as verified.',
    dotClassName: 'bg-muted-foreground',
  },
  deprecated: {
    label: 'Deprecated',
    description: 'No longer recommended for use as an alternate.',
    dotClassName: 'bg-warning',
  },
};

type AlternateGroupStatusDotProps = {
  status: VerificationStatus;
  className?: string;
};

export function AlternateGroupStatusDot({
  status,
  className,
}: AlternateGroupStatusDotProps) {
  const config = STATUS_CONFIG[status];

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          role="img"
          aria-label={config.label}
          className={cn(
            'mt-2 inline-block size-2.5 shrink-0 rounded-full',
            config.dotClassName,
            className,
          )}
          onClick={(event) => event.stopPropagation()}
        />
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        <p className="font-medium">{config.label}</p>
        <p className="text-xs text-muted-foreground">{config.description}</p>
      </TooltipContent>
    </Tooltip>
  );
}
