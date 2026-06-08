import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { QrCode, MapPin, Calendar, Forklift, Clock, ChevronRight } from 'lucide-react';
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { getEquipmentCardDisplayModel } from "@/features/equipment/utils/getEquipmentCardDisplayModel";
import { getEquipmentCardPmReadout } from "@/features/equipment/utils/getEquipmentCardPmReadout";
import { useUserSettings } from '@/hooks/useUserSettings';
import { getEquipmentStatusRailClass, getEquipmentStatusBackgroundTint } from "@/lib/status-colors";
import { PendingSyncBadge } from '@/features/offline-queue/components/PendingSyncBadge';
import PMStatusIndicator from './PMStatusIndicator';
import { EquipmentCardGridView } from './EquipmentCardGridView';
import { EquipmentCardWorkOrderMenu } from './EquipmentCardWorkOrderMenu';
import type { EquipmentPMStatus } from '@/features/equipment/hooks/useEquipmentPMStatus';
import type { MergedEquipment } from '@/features/equipment/hooks/useOfflineMergedEquipment';
import { isOfflineEquipmentId } from '@/features/equipment/hooks/useOfflineMergedEquipment';
import { toast } from 'sonner';

interface Equipment {
  id: string;
  name: string;
  manufacturer: string;
  model: string;
  serial_number: string;
  status: string;
  location: string;
  last_maintenance?: string;
  image_url?: string;
  default_pm_template_id?: string | null;
  working_hours?: number | null;
  // Populated by EquipmentService from the `team:team_id(id, name)` join.
  team_name?: string;
}

export type EquipmentViewMode = 'grid' | 'list' | 'table';

interface EquipmentCardProps {
  equipment: Equipment;
  onShowQRCode: (id: string) => void;
  viewMode?: EquipmentViewMode;
  pmStatus?: EquipmentPMStatus;
}

const EquipmentCard: React.FC<EquipmentCardProps> = ({
  equipment,
  onShowQRCode,
  viewMode = 'grid',
  pmStatus,
}) => {
  const navigate = useNavigate();
  const { settings } = useUserSettings();
  const display = getEquipmentCardDisplayModel(equipment, settings);
  const pmReadout = getEquipmentCardPmReadout(pmStatus);
  const statusRailClass = getEquipmentStatusRailClass(equipment.status);
  const statusTintClass = viewMode === 'grid' ? getEquipmentStatusBackgroundTint(equipment.status) : '';

  const handleCardClick = () => {
    if (isOfflineEquipmentId(equipment.id)) {
      toast.info('Pending sync', {
        description: 'This equipment will be available for viewing after it syncs.',
      });
      return;
    }
    navigate(`/dashboard/equipment/${equipment.id}`);
  };

  const handleQRClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isOfflineEquipmentId(equipment.id)) {
      toast.info('Pending sync', {
        description: 'QR codes are generated after the equipment syncs.',
      });
      return;
    }
    onShowQRCode(equipment.id);
  };

  const handleCardKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleCardClick();
    }
  };

  const handleQuickAction = (e: React.MouseEvent, path: string) => {
    e.stopPropagation();
    if (isOfflineEquipmentId(equipment.id)) {
      toast.info('Pending sync', {
        description: 'This action will be available after the equipment syncs.',
      });
      return;
    }
    navigate(path);
  };

  return (
    <Card
      className={cn(
        "min-w-0 w-full max-w-full overflow-hidden cursor-pointer cv-auto-lg",
        "card-lift hover:shadow-lg transition-all duration-normal",
        statusRailClass && "relative",
        statusTintClass,
        viewMode === 'grid' && "flex flex-col md:h-full"
      )}
      onClick={handleCardClick}
      onKeyDown={handleCardKeyDown}
      role="button"
      tabIndex={0}
      aria-label={`Open details for ${equipment.name}`}
    >
      {statusRailClass ? (
        <div
          className={cn('pointer-events-none absolute inset-y-0 left-0 z-10 w-1 rounded-l-lg', statusRailClass)}
          aria-hidden
        />
      ) : null}
      {/* Mobile: compact list row — no side action rail so content stays within viewport */}
      <div className="md:hidden">
        <div className="grid min-w-0 grid-cols-[4.5rem_1fr_auto] gap-x-2.5 gap-y-0.5 p-3">
          <div className="row-span-4 self-center">
            <div className="relative aspect-4/5 w-full overflow-hidden rounded-md bg-muted">
              {equipment.image_url ? (
                <img
                  src={equipment.image_url}
                  alt={display.imageAlt}
                  className="absolute inset-0 h-full w-full object-cover"
                  loading="lazy"
                  decoding="async"
                  onError={(e) => {
                    e.currentTarget.src = display.imageFallbackSrc;
                  }}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <Forklift className="h-[45%] w-[45%] text-muted-foreground/50" />
                </div>
              )}
            </div>
          </div>

          <div className="col-start-2 row-start-1 flex min-w-0 items-center gap-1.5">
            <span className="truncate text-sm font-semibold leading-tight">{equipment.name}</span>
            {(equipment as MergedEquipment)._isPendingSync && (
              <PendingSyncBadge className="flex-shrink-0" />
            )}
          </div>

          <div className="col-start-3 row-start-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 flex-shrink-0 -mr-1 text-muted-foreground hover:text-foreground"
              onClick={handleQRClick}
              aria-label={`Show QR code for ${equipment.name}`}
            >
              <QrCode className="h-4 w-4" />
            </Button>
          </div>

          <div className="col-start-2 row-start-2 flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3 flex-shrink-0" />
            <span className="truncate font-tabular">{display.lastMaintenanceMobileDisplay}</span>
          </div>

          <div className="col-start-2 row-start-3 flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5">
            <PMStatusIndicator status={pmStatus} size="sm" />
            <span className="inline-flex flex-shrink-0 items-center gap-0.5 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {display.workingHoursShortText}
            </span>
          </div>

          <div className="col-start-2 row-start-4 flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3 flex-shrink-0" />
            <span className="truncate">{equipment.location}</span>
          </div>

          <div className="col-start-3 row-start-4 self-end">
            <EquipmentCardWorkOrderMenu
              equipmentId={equipment.id}
              pmStatus={pmStatus}
              onQuickAction={handleQuickAction}
              variant="icon"
            />
          </div>
        </div>
      </div>

      {/* Desktop list view: compact single-row layout */}
      {viewMode === 'list' && (
        <div className="hidden md:block">
          <div className="flex items-center gap-4 px-4 py-3">
            <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded bg-muted">
              {equipment.image_url ? (
                <img
                  src={equipment.image_url}
                  alt={display.imageAlt}
                  className="h-full w-full object-cover"
                  loading="lazy"
                  decoding="async"
                  onError={(e) => { e.currentTarget.src = display.imageFallbackSrc; }}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <Forklift className="h-5 w-5 text-muted-foreground/50" />
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate text-sm font-semibold">{equipment.name}</span>
                <PMStatusIndicator status={pmStatus} size="sm" />
                {(equipment as MergedEquipment)._isPendingSync && <PendingSyncBadge />}
              </div>
              <div className="mt-0.5 text-xs text-muted-foreground truncate">
                {equipment.serial_number}
              </div>
            </div>

            <div className="hidden lg:flex items-center gap-1.5 text-xs text-muted-foreground flex-shrink-0">
              <MapPin className="h-3.5 w-3.5" />
              <span className="max-w-[160px] truncate">{equipment.location}</span>
            </div>

            <div className="hidden xl:flex items-center gap-1.5 text-xs text-muted-foreground flex-shrink-0">
              <Clock className="h-3.5 w-3.5" />
              <span className="font-medium">{display.workingHoursShortText}</span>
            </div>

            {display.lastMaintenanceText && (
              <div className="hidden xl:flex items-center gap-1.5 text-xs text-muted-foreground flex-shrink-0">
                <Calendar className="h-3.5 w-3.5" />
                <span>{display.lastMaintenanceText.replace('Last maintenance: ', '')}</span>
              </div>
            )}

            <div className="flex items-center gap-1 flex-shrink-0">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={handleQRClick}
                    aria-label={`Show QR code for ${equipment.name}`}
                  >
                    <QrCode className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Show QR Code</TooltipContent>
              </Tooltip>
              <ChevronRight className="h-4 w-4 text-muted-foreground/60" aria-hidden="true" />
            </div>
          </div>
        </div>
      )}

      {/* Desktop grid view: NASA-punk telemetry card */}
      {viewMode === 'grid' && (
        <EquipmentCardGridView
          equipment={equipment}
          display={display}
          pmReadout={pmReadout}
          pmStatus={pmStatus}
          isPendingSync={(equipment as MergedEquipment)._isPendingSync}
          onQRClick={handleQRClick}
          onQuickAction={handleQuickAction}
        />
      )}
    </Card>
  );
};

export default EquipmentCard;