import React from 'react';
import { Wrench } from 'lucide-react';
import { useLatestCompletedPMDetails } from '@/features/pm-templates/hooks/usePMData';
import { useFormatTimestamp } from '@/hooks/useFormatTimestamp';
import { buildServiceSummaryText } from '@/features/equipment/utils/serviceSummary';
import { cn } from '@/lib/utils';

interface EquipmentServiceSummaryBadgeProps {
  equipmentId: string | undefined;
  organizationId: string | undefined;
  className?: string;
}

/**
 * High-signal service context for equipment headers and the QR landing page,
 * derived from the most recent completed PM (including logged paper records).
 */
export const EquipmentServiceSummaryBadge: React.FC<EquipmentServiceSummaryBadgeProps> = ({
  equipmentId,
  organizationId,
  className,
}) => {
  const { formatDate } = useFormatTimestamp();
  const { data, isLoading, isError } = useLatestCompletedPMDetails(equipmentId, organizationId);

  // Stay out of the way while loading or when history is unavailable.
  if (isLoading || isError) return null;

  const summary = data ? buildServiceSummaryText(data.completed_at, data.hours_at_completion) : null;

  return (
    <span
      data-testid="equipment-service-summary"
      className={cn(
        'inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium',
        summary
          ? 'border-primary/30 bg-primary/10 text-foreground'
          : 'border-border bg-muted/50 text-muted-foreground',
        className,
      )}
      title={data && summary ? `Completed ${formatDate(data.completed_at)}` : undefined}
    >
      <Wrench className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
      <span className="truncate">{summary ?? 'No PM on record'}</span>
    </span>
  );
};
