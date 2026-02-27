import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { QrCode, MapPin, Calendar, Forklift, Clock } from 'lucide-react';
import { cn } from "@/lib/utils";
import { getEquipmentCardDisplayModel } from "@/features/equipment/utils/getEquipmentCardDisplayModel";
import { getEquipmentStatusBorderClass } from "@/lib/status-colors";
import { PendingSyncBadge } from '@/features/offline-queue/components/PendingSyncBadge';
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
}

interface EquipmentCardProps {
  equipment: Equipment;
  onShowQRCode: (id: string) => void;
}

const EquipmentCard: React.FC<EquipmentCardProps> = ({
  equipment,
  onShowQRCode
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

  return (
    <Card 
      className={cn("hover:shadow-lg transition-all duration-normal cursor-pointer", statusBorderClass)}
      onClick={handleCardClick}
    >
      {/* Mobile: compact horizontal list item */}
      <div className="md:hidden overflow-hidden">
        <div className="flex min-w-0">
          {/* Image area with status badge overlay */}
          <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-l-md bg-muted">
            {equipment.image_url ? (
              <img
                src={equipment.image_url}
                alt={display.imageAlt}
                className="h-full w-full object-cover"
                onError={(e) => {
                  e.currentTarget.src = display.imageFallbackSrc;
                }}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <Forklift className="h-8 w-8 text-muted-foreground/50" />
              </div>
            )}
            {/* Status badge overlaid on image - only for non-active statuses */}
            {display.showStatusBadge && (
              <Badge 
                className={`${display.statusClassName} absolute bottom-1 left-1 px-1.5 py-0 text-[10px]`} 
                variant="outline"
              >
                {display.statusText}
              </Badge>
            )}
          </div>

          <div className="flex min-w-0 flex-1 flex-col justify-between p-3 overflow-hidden">
            <div className="flex items-start justify-between gap-2 min-w-0">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="truncate text-sm font-semibold">{equipment.name}</div>
                  {(equipment as MergedEquipment)._isPendingSync && <PendingSyncBadge className="flex-shrink-0" />}
                </div>
                <div className="mt-0.5 truncate text-xs text-muted-foreground">
                  ID: {equipment.serial_number}
                </div>
              </div>

              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 flex-shrink-0"
                onClick={handleQRClick}
              >
                <QrCode className="h-3.5 w-3.5" />
                <span className="sr-only">Show QR Code</span>
              </Button>
            </div>

            <div className="mt-2 flex items-center gap-1.5 min-w-0">
              <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
              <span className="truncate text-xs text-muted-foreground">{equipment.location}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop (md+): preserve existing large card layout */}
      <div className="hidden md:block">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg">{equipment.name}</CardTitle>
              <CardDescription>
                {equipment.manufacturer} {equipment.model}
              </CardDescription>
              {/* Only show badge for non-active statuses */}
              <div className="mt-1.5 flex items-center gap-2">
                {display.showStatusBadge && (
                  <Badge className={`${display.statusClassName} text-xs`} variant="outline">
                    {display.statusText}
                  </Badge>
                )}
                {(equipment as MergedEquipment)._isPendingSync && <PendingSyncBadge />}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 flex-shrink-0"
              onClick={handleQRClick}
              aria-label={`Show QR code for ${equipment.name}`}
            >
              <QrCode className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 md:space-y-4">
          {/* Equipment Image */}
          <div className="aspect-video w-full overflow-hidden rounded-md bg-muted">
            {equipment.image_url ? (
              <img
                src={equipment.image_url}
                alt={display.imageAlt}
                className="h-full w-full object-cover transition-transform hover:scale-105"
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
      </div>
    </Card>
  );
};

export default EquipmentCard;