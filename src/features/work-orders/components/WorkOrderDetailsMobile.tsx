import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { CalendarDays, ChevronDown, ChevronUp, Clipboard, CheckCircle2, Clock, Wrench, Forklift, MapPin } from 'lucide-react';
import { GoogleMap, MarkerF } from '@react-google-maps/api';
import { useEquipmentCurrentWorkingHours } from '@/features/equipment/hooks/useEquipmentWorkingHours';
import { useGoogleMapsLoader } from '@/hooks/useGoogleMapsLoader';
import ClickableAddress from '@/components/ui/ClickableAddress';
import { humanizeAttributeKey, humanizeAttributeValue } from '@/features/work-orders/utils/workOrderHelpers';
import type { EffectiveLocation } from '@/utils/effectiveLocation';

interface WorkOrderDetailsMobileProps {
  workOrder: {
    id: string;
    title: string;
    description?: string;
    priority: 'low' | 'medium' | 'high';
    status: 'submitted' | 'accepted' | 'assigned' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled';
    created_at?: string;
    due_date?: string;
    estimated_hours?: number;
    has_pm?: boolean;
    pm_status?: 'pending' | 'in_progress' | 'completed' | 'cancelled';
    pm_progress?: number;
    pm_total?: number;
    equipment_working_hours_at_creation?: number;
  };
  equipment?: {
    id: string;
    name: string;
    manufacturer?: string;
    model?: string;
    serial_number?: string;
    status: string;
    location?: string;
    team_id?: string | null;
    custom_attributes?: Record<string, unknown> | null;
    image_url?: string | null;
  };
  team?: {
    id: string;
    name: string;
  };
  assignee?: {
    id: string;
    name: string;
  };
  costs?: {
    total: number;
    items: Array<{
      id: string;
      description: string;
      amount: number;
    }>;
  };
  /** Resolved effective location for the equipment */
  effectiveLocation?: EffectiveLocation | null;
}

interface LocationMapProps {
  effectiveLocation?: EffectiveLocation | null;
  equipmentLocation?: string | null;
}

const LocationMap: React.FC<LocationMapProps> = ({ effectiveLocation, equipmentLocation }) => {
  const { isLoaded: isMapsLoaded } = useGoogleMapsLoader();
  const hasCoords = effectiveLocation?.lat != null && effectiveLocation?.lng != null;

  return (
    <div className="overflow-hidden rounded-lg border">
      {(() => {
        if (hasCoords && isMapsLoaded && effectiveLocation) {
          const center = { lat: effectiveLocation.lat!, lng: effectiveLocation.lng! };
          return (
            <div className="flex h-40 flex-col">
              <div className="min-h-0 flex-1">
                <GoogleMap
                  mapContainerStyle={{ width: '100%', height: '100%' }}
                  center={center}
                  zoom={14}
                  options={{
                    disableDefaultUI: true,
                    zoomControl: false,
                    mapTypeControl: false,
                    streetViewControl: false,
                    fullscreenControl: false,
                  }}
                >
                  <MarkerF position={center} />
                </GoogleMap>
              </div>
              {effectiveLocation.formattedAddress ? (
                <div className="flex min-h-[44px] touch-manipulation items-center gap-1.5 bg-background px-2 py-1.5">
                  <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <ClickableAddress
                    address={effectiveLocation.formattedAddress}
                    lat={effectiveLocation.lat!}
                    lng={effectiveLocation.lng!}
                    className="text-xs"
                  />
                </div>
              ) : null}
            </div>
          );
        }

        if (hasCoords && !isMapsLoaded) {
          return (
            <div className="flex h-40 w-full items-center justify-center bg-muted/50">
              <div className="text-center">
                <MapPin className="mx-auto h-6 w-6 animate-pulse text-muted-foreground/50" />
                <p className="mt-1 text-xs text-muted-foreground">Loading map...</p>
              </div>
            </div>
          );
        }

        if (equipmentLocation) {
          return (
            <div className="flex h-40 w-full items-center justify-center bg-muted/50">
              <div className="px-4 text-center">
                <MapPin className="mx-auto h-6 w-6 text-muted-foreground/50" />
                <p className="mt-1 text-xs text-muted-foreground">{equipmentLocation}</p>
              </div>
            </div>
          );
        }

        return (
          <div className="flex h-40 w-full items-center justify-center bg-muted/50">
            <div className="text-center">
              <MapPin className="mx-auto h-6 w-6 text-muted-foreground/50" />
              <p className="mt-1 text-xs text-muted-foreground">No location set</p>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export const WorkOrderDetailsMobile: React.FC<WorkOrderDetailsMobileProps> = ({
  workOrder,
  equipment,
  effectiveLocation,
}) => {
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [isEquipmentDetailsExpanded, setIsEquipmentDetailsExpanded] = useState(false);

  const { data: currentWorkingHours, isLoading: workingHoursLoading } = useEquipmentCurrentWorkingHours(
    equipment?.id || '',
  );

  const workingHours = workOrder.equipment_working_hours_at_creation ?? currentWorkingHours;

  const pmProgressPercent =
    workOrder.pm_total && workOrder.pm_total > 0
      ? Math.round(((workOrder.pm_progress || 0) / workOrder.pm_total) * 100)
      : 0;

  const [animatedProgress, setAnimatedProgress] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      setAnimatedProgress(pmProgressPercent);
    });
    return () => cancelAnimationFrame(id);
  }, [pmProgressPercent]);

  const locationSummary =
    effectiveLocation?.formattedAddress?.trim() ||
    equipment?.location?.trim() ||
    '';

  return (
    <div className="space-y-3">
      <Card className="shadow-elevation-2 border-l-4 border-l-primary">
        <CardContent className="space-y-3 p-4">
          {equipment ? (
            <div className="flex min-h-[44px] items-center gap-2 text-[15px]">
              <Forklift className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              <span className="font-medium">Equipment:</span>
              <span className="text-muted-foreground">{equipment.name}</span>
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="rounded-full px-2 py-0.5 text-xs capitalize">
              {workOrder.status.replace(/_/g, ' ')}
            </Badge>
            <Badge variant="outline" className="rounded-full px-2 py-0.5 text-xs capitalize">
              {workOrder.priority} priority
            </Badge>
          </div>

          {workOrder.due_date ? (
            <div className="flex items-center gap-2 text-[15px]">
              <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              <span className="font-medium">Due:</span>
              <span className="text-muted-foreground">{new Date(workOrder.due_date).toLocaleDateString()}</span>
            </div>
          ) : null}

          {locationSummary ? (
            <div className="flex min-h-[44px] items-start gap-2 text-[15px]">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              <div>
                <span className="font-medium">Location: </span>
                <span className="text-muted-foreground">{locationSummary}</span>
              </div>
            </div>
          ) : null}

          {workOrder.has_pm ? (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Clipboard className="h-4 w-4 text-primary" aria-hidden />
                <span className="font-semibold">PM checklist</span>
                {workOrder.pm_status === 'completed' ? (
                  <Badge variant="outline" className="gap-1 border-success/30 bg-success/15 text-success">
                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                    Done
                  </Badge>
                ) : (
                  <span className="tabular-nums text-muted-foreground">
                    {workOrder.pm_progress || 0} / {workOrder.pm_total || 0}
                  </span>
                )}
              </div>
              {workOrder.pm_status !== 'completed' ? (
                <Progress
                  value={animatedProgress}
                  className="h-2 rounded-full bg-muted/40"
                  aria-label={`Checklist completion ${animatedProgress}%`}
                />
              ) : null}
            </div>
          ) : null}

          {workOrder.estimated_hours != null ? (
            <div className="flex items-center gap-2 text-[15px]">
              <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="font-medium">Estimated:</span>
              <span className="text-muted-foreground">{workOrder.estimated_hours}h</span>
            </div>
          ) : null}

          <div className="flex items-center gap-2 text-[15px]">
            <Wrench className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="font-medium">
              {workOrder.equipment_working_hours_at_creation ? 'Meter at creation:' : 'Equipment hours:'}
            </span>
            <span className="text-muted-foreground">
              {workingHoursLoading ? (
                <span className="animate-pulse">...</span>
              ) : (
                `${workingHours?.toLocaleString() || 0} hrs`
              )}
            </span>
          </div>
        </CardContent>
      </Card>

      {workOrder.description ? (
        <Card className="shadow-elevation-2">
          <CardContent standalone>
            <Collapsible open={isDescriptionExpanded} onOpenChange={setIsDescriptionExpanded}>
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="flex min-h-[44px] w-full touch-manipulation items-center justify-between text-left"
                >
                  <span className="inline-flex items-center gap-2 text-base font-semibold">
                    <Clipboard className="h-4 w-4 text-muted-foreground" />
                    Description
                  </span>
                  {isDescriptionExpanded ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pm-collapsible-animate mt-3 overflow-hidden data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 data-[state=open]:slide-in-from-top-2 data-[state=closed]:slide-out-to-top-2 data-[state=open]:duration-200 data-[state=closed]:duration-150">
                <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-foreground/80">{workOrder.description}</p>
              </CollapsibleContent>
            </Collapsible>
            {!isDescriptionExpanded && workOrder.description.length > 100 ? (
              <p className="mt-2 line-clamp-2 text-[15px] text-muted-foreground">{workOrder.description}</p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {equipment ? (
        <Card className="shadow-elevation-2">
          <CardContent standalone>
            <Collapsible open={isEquipmentDetailsExpanded} onOpenChange={setIsEquipmentDetailsExpanded}>
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="flex min-h-[44px] w-full touch-manipulation items-center justify-between text-left"
                >
                  <span className="inline-flex items-center gap-2 text-base font-semibold">
                    <Wrench className="h-4 w-4 text-muted-foreground" />
                    Equipment Details
                  </span>
                  {isEquipmentDetailsExpanded ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pm-collapsible-animate mt-3 space-y-3 overflow-hidden text-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 data-[state=open]:slide-in-from-top-2 data-[state=closed]:slide-out-to-top-2 data-[state=open]:duration-200 data-[state=closed]:duration-150">
                <div className="overflow-hidden rounded-lg border">
                  {equipment.image_url ? (
                    <img
                      src={equipment.image_url}
                      alt={equipment.name}
                      className="h-40 w-full object-cover"
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    <div className="flex h-40 w-full items-center justify-center bg-muted">
                      <Forklift className="h-12 w-12 text-muted-foreground" />
                    </div>
                  )}
                </div>

                {isEquipmentDetailsExpanded ? (
                  <LocationMap effectiveLocation={effectiveLocation} equipmentLocation={equipment.location} />
                ) : null}

                {equipment.manufacturer && equipment.model ? (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Model</span>
                    <span>
                      {equipment.manufacturer} {equipment.model}
                    </span>
                  </div>
                ) : null}
                {equipment.serial_number ? (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Serial</span>
                    <span className="font-mono">{equipment.serial_number}</span>
                  </div>
                ) : null}
                {workOrder.equipment_working_hours_at_creation ? (
                  <div className="mt-2 rounded bg-muted p-2 text-xs text-muted-foreground">
                    Hours shown are from work order creation time
                  </div>
                ) : null}
                {equipment.custom_attributes && Object.keys(equipment.custom_attributes).length > 0 ? (
                  <>
                    <div className="my-2 border-t" />
                    {Object.entries(equipment.custom_attributes).map(
                      ([key, val]) =>
                        val != null && (
                          <div key={key} className="flex justify-between gap-4">
                            <span className="shrink-0 text-muted-foreground">{humanizeAttributeKey(key)}</span>
                            <span className="break-words text-right">{humanizeAttributeValue(val)}</span>
                          </div>
                        ),
                    )}
                  </>
                ) : null}
              </CollapsibleContent>
            </Collapsible>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
};
