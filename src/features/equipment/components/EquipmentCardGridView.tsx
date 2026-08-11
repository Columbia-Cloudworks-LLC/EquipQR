import React from 'react';
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  QrCode,
  Forklift,
  History,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { PendingSyncBadge } from '@/features/offline-queue/components/PendingSyncBadge';
import { EquipmentCardWorkOrderMenu } from '@/features/equipment/components/EquipmentCardWorkOrderMenu';
import type { EquipmentCardDisplayModel } from '@/features/equipment/utils/getEquipmentCardDisplayModel';
import type { EquipmentCardPmReadout } from '@/features/equipment/utils/getEquipmentCardPmReadout';
import { displayableImageSrc } from '@/services/imageUploadService';
import { getPMComplianceLevel } from '@/features/equipment/hooks/useEquipmentPMStatus';
import type { EquipmentPMStatus } from '@/features/equipment/hooks/useEquipmentPMStatus';
import { getEquipmentViewTransitionStyle } from '@/features/equipment/transitions/equipmentViewTransitionNames';

interface EquipmentCardGridViewProps {
  equipment: {
    id: string;
    name: string;
    image_url?: string;
    team_name?: string;
  };
  display: EquipmentCardDisplayModel;
  pmReadout: EquipmentCardPmReadout;
  pmStatus?: EquipmentPMStatus;
  isPendingSync?: boolean;
  onQRClick: (e: React.MouseEvent) => void;
  onQuickAction: (e: React.MouseEvent, path: string) => void;
  imageLoading?: 'eager' | 'lazy';
  isTransitionActive?: boolean;
}

function getWorkingHoursMetricClass(display: string): string {
  if (display.length > 8) {
    return 'text-lg';
  }
  if (display.length > 6) {
    return 'text-xl';
  }
  return 'text-2xl';
}

function TelemetryCell({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('min-w-0 overflow-hidden rounded-lg bg-muted/30 p-3 min-h-[4.5rem]', className)}>
      <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <div className="mt-1.5 min-w-0 overflow-hidden">{children}</div>
    </div>
  );
}

export function EquipmentCardGridView({
  equipment,
  display,
  pmReadout,
  pmStatus,
  isPendingSync,
  onQRClick,
  onQuickAction,
  imageLoading = 'lazy',
  isTransitionActive = false,
}: EquipmentCardGridViewProps) {
  const pmLevel = getPMComplianceLevel(pmStatus);
  const isPmOverdue = pmLevel === 'overdue';
  const resolvedImageSrc = displayableImageSrc(equipment.image_url);

  return (
    <div className="hidden md:flex md:flex-col md:h-full">
      <CardHeader className="space-y-2 pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1 space-y-1">
            {equipment.team_name ? (
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground truncate">
                {equipment.team_name}
              </p>
            ) : null}
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle
                className="text-lg font-semibold leading-tight"
                style={getEquipmentViewTransitionStyle('name', isTransitionActive)}
              >
                {equipment.name}
              </CardTitle>
              {isPendingSync ? <PendingSyncBadge className="flex-shrink-0" /> : null}
            </div>
            <div style={getEquipmentViewTransitionStyle('meta', isTransitionActive)}>
              <p className="text-sm text-muted-foreground truncate">{display.assetDescriptor}</p>
              <p className="font-tabular text-xs text-muted-foreground truncate">{display.serialDisplay}</p>
            </div>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 flex-shrink-0 border-border/80 bg-background/80"
                onClick={onQRClick}
                aria-label={`Show QR code for ${equipment.name}`}
              >
                <QrCode className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Show QR Code</TooltipContent>
          </Tooltip>
        </div>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col space-y-3 pt-0">
        <div
          className="relative aspect-[16/10] w-full overflow-hidden rounded-md border border-border/80 bg-muted"
          style={getEquipmentViewTransitionStyle('image', isTransitionActive)}
        >
          {resolvedImageSrc ? (
            <img
              src={resolvedImageSrc}
              alt={display.imageAlt}
              className="h-full w-full object-cover"
              loading={imageLoading}
              decoding="async"
              onError={(e) => {
                e.currentTarget.src = display.imageFallbackSrc;
              }}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Forklift className="h-12 w-12 text-muted-foreground/50" />
            </div>
          )}
        </div>

        <div
          className={cn(
            'grid grid-cols-2 gap-2',
            isPmOverdue && 'rounded-lg gradient-warning p-0.5'
          )}
        >
          <TelemetryCell label="Location">
            <p
              className="text-sm text-foreground truncate"
              title={display.locationDisplay}
              style={getEquipmentViewTransitionStyle('location', isTransitionActive)}
            >
              {display.locationDisplay}
            </p>
          </TelemetryCell>

          <TelemetryCell label="Hours">
            <Tooltip>
              <TooltipTrigger asChild>
                <span
                  className={cn(
                    'block min-w-0 truncate font-tabular font-bold leading-none tracking-tight text-foreground',
                    getWorkingHoursMetricClass(display.workingHoursDisplay)
                  )}
                  style={getEquipmentViewTransitionStyle('hours', isTransitionActive)}
                >
                  {display.workingHoursDisplay}
                </span>
              </TooltipTrigger>
              <TooltipContent>{display.workingHoursShortText}</TooltipContent>
            </Tooltip>
          </TelemetryCell>

          <TelemetryCell label="Last maint">
            <p className="text-sm text-foreground font-tabular truncate">
              {display.lastMaintenanceDisplay}
            </p>
          </TelemetryCell>

          <TelemetryCell label="PM status">
            <Tooltip>
              <TooltipTrigger asChild>
                <p className={cn('text-sm truncate', pmReadout.valueClassName)}>{pmReadout.label}</p>
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-[16rem] text-xs">{pmReadout.detail}</p>
              </TooltipContent>
            </Tooltip>
          </TelemetryCell>
        </div>
      </CardContent>

      <div
        className="mt-auto flex items-center gap-2 border-t border-border/80 bg-muted/20 px-4 py-2.5"
        role="group"
        aria-label="Equipment actions"
      >
        <EquipmentCardWorkOrderMenu
          equipmentId={equipment.id}
          pmStatus={pmStatus}
          onQuickAction={onQuickAction}
        />
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          onClick={(e) => {
            e.stopPropagation();
            onQuickAction(e, `/dashboard/equipment/${equipment.id}?tab=scan-history`);
          }}
        >
          <History className="h-3.5 w-3.5" />
          History
        </Button>
      </div>
    </div>
  );
}
