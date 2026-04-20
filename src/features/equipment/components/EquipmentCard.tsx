import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { QrCode, MapPin, Calendar, Forklift, Clock, ChevronRight, ClipboardList, History } from 'lucide-react';
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { getEquipmentCardDisplayModel } from "@/features/equipment/utils/getEquipmentCardDisplayModel";
import { getEquipmentStatusBorderClass } from "@/lib/status-colors";
import { PendingSyncBadge } from '@/features/offline-queue/components/PendingSyncBadge';
import PMStatusIndicator from './PMStatusIndicator';
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
  const display = getEquipmentCardDisplayModel(equipment);
  const statusBorderClass = getEquipmentStatusBorderClass(equipment.status);

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
      className={cn("hover:shadow-lg transition-all duration-normal cursor-pointer", statusBorderClass)}
      onClick={handleCardClick}
      onKeyDown={handleCardKeyDown}
      role="button"
      tabIndex={0}
      aria-label={`Open details for ${equipment.name}`}
    >
      {/* Mobile: compact horizontal list item */}
      <div className="md:hidden overflow-hidden">
        <div className="flex min-w-0 items-stretch">
          {/* Thumbnail — slightly taller to give content breathing room */}
          <div className="relative h-[88px] w-[88px] flex-shrink-0 overflow-hidden rounded-l-md bg-muted self-center">
            {equipment.image_url ? (
              <img
                src={equipment.image_url}
                alt={display.imageAlt}
                className="h-full w-full object-cover"
                loading="lazy"
                decoding="async"
                onError={(e) => {
                  e.currentTarget.src = display.imageFallbackSrc;
                }}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <Forklift className="h-8 w-8 text-muted-foreground/50" />
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex min-w-0 flex-1 flex-col justify-center gap-1 px-3 py-3 overflow-hidden">
            {/* Title row */}
            <div className="flex items-center gap-2 min-w-0">
              <div className="truncate text-sm font-semibold leading-tight">{equipment.name}</div>
              {(equipment as MergedEquipment)._isPendingSync && <PendingSyncBadge className="flex-shrink-0" />}
            </div>
            {/* Status + PM indicator row */}
            <div className="flex items-center gap-2 min-w-0">
              <Badge className={`${display.statusClassName} rounded-full px-2 py-0.5 text-xs flex-shrink-0`} variant="outline">
                {display.statusLabel}
              </Badge>
              <PMStatusIndicator status={pmStatus} size="sm" />
            </div>
            {/* Metadata row — bumped to 13px and higher contrast for field legibility */}
            <div className="flex items-center gap-3 min-w-0 text-[13px] text-foreground/65">
              <span className="flex items-center gap-1 min-w-0 truncate">
                <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="truncate">{equipment.location}</span>
              </span>
              <span className="flex items-center gap-1 flex-shrink-0">
                <Clock className="h-3.5 w-3.5" />
                {display.workingHoursShortText}
              </span>
            </div>
          </div>

          {/* Actions — QR separated from chevron by a border to prevent mis-taps */}
          <div className="flex flex-shrink-0 items-center self-stretch border-l">
            <Button
              variant="ghost"
              size="icon"
              className="h-full w-12 rounded-none flex-shrink-0 text-muted-foreground hover:text-foreground hover:bg-muted/60"
              onClick={handleQRClick}
              aria-label={`Show QR code for ${equipment.name}`}
            >
              <QrCode className="h-4.5 w-4.5" />
            </Button>
            <div className="flex h-full w-10 items-center justify-center text-muted-foreground/60" aria-hidden="true">
              <ChevronRight className="h-4 w-4" />
            </div>
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
                <Badge className={`${display.statusClassName} rounded-full px-2 py-0.5 text-xs`} variant="outline">
                  {display.statusLabel}
                </Badge>
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

      {/* Desktop grid view: full card layout */}
      {viewMode === 'grid' && (
        <div className="hidden md:block">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <CardTitle className="text-lg">{equipment.name}</CardTitle>
                <CardDescription>
                  {equipment.team_name || `${equipment.manufacturer} ${equipment.model}`}
                </CardDescription>
                <div className="mt-1.5 flex items-center gap-2">
                  <Badge className={`${display.statusClassName} rounded-full px-2 py-0.5 text-xs`} variant="outline">
                    {display.statusLabel}
                  </Badge>
                  <PMStatusIndicator status={pmStatus} size="sm" />
                  {(equipment as MergedEquipment)._isPendingSync && <PendingSyncBadge />}
                </div>
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 flex-shrink-0"
                    onClick={handleQRClick}
                    aria-label={`Show QR code for ${equipment.name}`}
                  >
                    <QrCode className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Show QR Code</TooltipContent>
              </Tooltip>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 md:space-y-4">
            <div className="aspect-video w-full overflow-hidden rounded-md bg-muted">
              {equipment.image_url ? (
                <img
                  src={equipment.image_url}
                  alt={display.imageAlt}
                  className="h-full w-full object-cover transition-transform hover:scale-105"
                  loading="lazy"
                  decoding="async"
                  onError={(e) => { e.currentTarget.src = display.imageFallbackSrc; }}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <Forklift className="h-12 w-12 text-muted-foreground/50" />
                </div>
              )}
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="font-medium">Serial:</span>
                <span className="text-muted-foreground break-words">{equipment.serial_number}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-muted-foreground truncate">{equipment.location}</span>
              </div>
              <div className="flex items-center gap-4 flex-wrap">
                {display.lastMaintenanceText && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-muted-foreground text-xs md:text-sm">
                      {display.lastMaintenanceText}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-muted-foreground text-xs md:text-sm font-medium">
                    {display.workingHoursText}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
          <div className="flex items-center gap-1 border-t px-4 py-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
              onClick={(e) => handleQuickAction(e, `/dashboard/work-orders/new?equipmentId=${equipment.id}`)}
            >
              <ClipboardList className="h-3.5 w-3.5" />
              + Work Order
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
              onClick={(e) => handleQuickAction(e, `/dashboard/equipment/${equipment.id}?tab=history`)}
            >
              <History className="h-3.5 w-3.5" />
              History
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
};

export default EquipmentCard;