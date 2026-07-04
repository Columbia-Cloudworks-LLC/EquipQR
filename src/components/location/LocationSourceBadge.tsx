import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  getFleetMapSourceLabel,
  getLocationSourceLabel,
  type FleetMapSource,
  type LocationSource,
} from '@/utils/effectiveLocation';

type LocationSourceBadgeProps = {
  source: LocationSource | FleetMapSource;
  className?: string;
  variant?: 'fleet' | 'asset';
};

const ASSET_BADGE_CLASSES: Record<LocationSource, string> = {
  team: 'bg-info/15 text-info border-info/30',
  manual: 'bg-primary/15 text-primary border-primary/30',
  scan: 'bg-success/15 text-success border-success/30',
  legacy: 'bg-warning/15 text-warning border-warning/30',
};

const FLEET_BADGE_CLASSES: Record<FleetMapSource, string> = {
  team: 'bg-info text-info-foreground',
  manual: 'bg-primary text-primary-foreground',
  scan: 'bg-success text-success-foreground',
  legacy: 'bg-warning text-warning-foreground',
  geocoded: 'bg-warning text-warning-foreground',
};

export function LocationSourceBadge({
  source,
  className,
  variant = 'asset',
}: LocationSourceBadgeProps) {
  const label =
    variant === 'fleet' && (source === 'geocoded' || source in FLEET_BADGE_CLASSES)
      ? getFleetMapSourceLabel(source as FleetMapSource)
      : getLocationSourceLabel(source as LocationSource);

  const badgeClass =
    variant === 'fleet'
      ? FLEET_BADGE_CLASSES[source as FleetMapSource]
      : ASSET_BADGE_CLASSES[source as LocationSource];

  return (
    <Badge variant="outline" className={cn('text-[11px] font-medium', badgeClass, className)}>
      {label}
    </Badge>
  );
}
