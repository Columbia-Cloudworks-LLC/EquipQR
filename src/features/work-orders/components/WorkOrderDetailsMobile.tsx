import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  ChevronDown, 
  ChevronUp, 
  User,
  Clock,
  ExternalLink,
  Clipboard,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Wrench,
  Forklift,
  MapPin
} from 'lucide-react';
import { GoogleMap, MarkerF } from '@react-google-maps/api';
import { useEquipmentCurrentWorkingHours } from '@/features/equipment/hooks/useEquipmentWorkingHours';
import { useGoogleMapsLoader } from '@/hooks/useGoogleMapsLoader';
import ClickableAddress from '@/components/ui/ClickableAddress';
import { cn } from '@/lib/utils';
import { humanizeAttributeKey, humanizeAttributeValue, isOverdue as checkIsOverdue } from '@/features/work-orders/utils/workOrderHelpers';
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
  /** Callback to scroll to the PM section */
  onScrollToPM?: () => void;
  /** Open mobile actions focused on destructive actions */
  onDeleteRequest?: () => void;
}

const getDueDateStatus = (dueDate: string, status: string): 'overdue' | 'due_soon' | 'normal' => {
  if (checkIsOverdue(dueDate, status as Parameters<typeof checkIsOverdue>[1])) return 'overdue';
  const due = new Date(dueDate);
  const now = new Date();
  const hoursUntilDue = (due.getTime() - now.getTime()) / (1000 * 60 * 60);
  if (hoursUntilDue > 0 && hoursUntilDue < 24) return 'due_soon';
  return 'normal';
};

export const WorkOrderDetailsMobile: React.FC<WorkOrderDetailsMobileProps> = ({
  workOrder,
  equipment,
  assignee,
  effectiveLocation,
  onScrollToPM,
  onDeleteRequest,
}) => {
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(true);
  const [isEquipmentDetailsExpanded, setIsEquipmentDetailsExpanded] = useState(false);
  const { isLoaded: isMapsLoaded } = useGoogleMapsLoader();
  
  // Get equipment working hours (current for reference)
  const { data: currentWorkingHours, isLoading: workingHoursLoading } = useEquipmentCurrentWorkingHours(
    equipment?.id || ''
  );
  
  // Use historical working hours from work order if available, otherwise show current
  const workingHours = workOrder.equipment_working_hours_at_creation ?? currentWorkingHours;

  // Calculate PM progress percentage
  const pmProgressPercent = workOrder.pm_total && workOrder.pm_total > 0 
    ? Math.round((workOrder.pm_progress || 0) / workOrder.pm_total * 100)
    : 0;

  // Animate progress bar from 0 → real value on mount for visual satisfaction
  const [animatedProgress, setAnimatedProgress] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      setAnimatedProgress(pmProgressPercent);
    });
    return () => cancelAnimationFrame(id);
  }, [pmProgressPercent]);

  const dueDateStatus = workOrder.due_date ? getDueDateStatus(workOrder.due_date, workOrder.status) : 'normal';
  const isOverdue = dueDateStatus === 'overdue';
  const isDueSoon = dueDateStatus === 'due_soon';

  return (
    <div className="space-y-3">
      {/* Top Summary Card — unique data not in mobile header */}
      <Card className="shadow-elevation-2 border-l-4 border-l-primary">
        <CardContent className="p-4 space-y-3">
          {/* Assignee */}
          {assignee && (
            <div className="flex items-center gap-2 text-[15px]">
              <User className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="font-medium">Assigned to:</span>
              <span className="text-muted-foreground">{assignee.name}</span>
            </div>
          )}

          {/* Due Date */}
          {workOrder.due_date && (
            <div className={cn(
              "flex items-center gap-2 text-[15px]",
              isOverdue && "text-destructive",
              isDueSoon && !isOverdue && "text-warning"
            )}>
              {isOverdue
                ? <AlertCircle className="h-4 w-4 shrink-0" />
                : isDueSoon
                  ? <AlertTriangle className="h-4 w-4 shrink-0" />
                  : <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
              }
              <span className="font-medium">Due:</span>
              <span>{new Date(workOrder.due_date).toLocaleDateString()}</span>
              {isOverdue && (
                <Badge variant="outline" className="text-xs bg-destructive/10 text-destructive border-destructive/30">
                  OVERDUE
                </Badge>
              )}
              {isDueSoon && !isOverdue && (
                <Badge variant="outline" className="text-xs bg-warning/10 text-warning border-warning/30">
                  <AlertTriangle className="h-3 w-3 mr-0.5" />
                  DUE SOON
                </Badge>
              )}
            </div>
          )}

          {/* Estimated Hours */}
          {workOrder.estimated_hours != null && (
            <div className="flex items-center gap-2 text-[15px]">
              <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="font-medium">Estimated:</span>
              <span className="text-muted-foreground">{workOrder.estimated_hours}h</span>
            </div>
          )}

          {/* Working Hours */}
          <div className="flex items-center gap-2 text-[15px]">
            <Wrench className="h-4 w-4 text-muted-foreground shrink-0" />
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

          {/* Equipment quick link */}
          {equipment && (
            <div className="flex items-center justify-between text-[15px] border-t pt-3 mt-1">
              <div className="flex items-center gap-2">
                <Wrench className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="font-medium text-muted-foreground">Equipment</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="min-h-[44px] gap-1.5 text-primary touch-manipulation"
                asChild
              >
                <Link to={`/dashboard/equipment/${equipment.id}`}>
                  {equipment.name}
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* PM Checklist Progress Card */}
      {workOrder.has_pm && (
        <Card 
          className={cn(
            "shadow-elevation-2 transition-colors",
            onScrollToPM && "cursor-pointer hover:bg-muted/50",
            workOrder.pm_status === 'completed' && "border-success/30 dark:border-success/40"
          )}
          onClick={onScrollToPM ? () => onScrollToPM() : undefined}
        >
          <CardContent standalone>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Clipboard className="h-4 w-4 text-muted-foreground" />
                <span className="font-semibold text-base">PM Checklist</span>
              </div>
              <div className="flex items-center gap-2">
                {workOrder.pm_status === 'completed' ? (
                  <Badge variant="outline" className="bg-success/20 text-success border-success/30">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Complete
                  </Badge>
                ) : (
                  <span className="text-sm font-medium tabular-nums">
                    {workOrder.pm_progress || 0} / {workOrder.pm_total || 0}
                  </span>
                )}
              </div>
            </div>
            <Progress value={animatedProgress} className="h-2.5" />
            <p className="text-xs text-muted-foreground mt-2">
              Tap to view and complete checklist items
            </p>
          </CardContent>
        </Card>
      )}

      {/* Description - Collapsible */}
      {workOrder.description && (
        <Card className="shadow-elevation-2">
          <CardContent standalone>
            <Collapsible open={isDescriptionExpanded} onOpenChange={setIsDescriptionExpanded}>
              <CollapsibleTrigger asChild>
                <button className="flex items-center justify-between w-full text-left min-h-[44px] touch-manipulation">
                  <span className="inline-flex items-center gap-2 font-semibold text-base">
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
              <CollapsibleContent className="pm-collapsible-animate overflow-hidden data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 data-[state=open]:slide-in-from-top-2 data-[state=closed]:slide-out-to-top-2 data-[state=open]:duration-200 data-[state=closed]:duration-150 mt-3">
                <p className="text-[15px] text-foreground/80 leading-relaxed whitespace-pre-wrap">
                  {workOrder.description}
                </p>
              </CollapsibleContent>
            </Collapsible>
            {!isDescriptionExpanded && workOrder.description.length > 100 && (
              <p className="text-[15px] text-muted-foreground mt-2 line-clamp-2">
                {workOrder.description}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Equipment Details - Collapsible */}
      {equipment && (
        <Card className="shadow-elevation-2">
          <CardContent standalone>
            <Collapsible open={isEquipmentDetailsExpanded} onOpenChange={setIsEquipmentDetailsExpanded}>
              <CollapsibleTrigger asChild>
                <button className="flex items-center justify-between w-full text-left min-h-[44px] touch-manipulation">
                  <span className="inline-flex items-center gap-2 font-semibold text-base">
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
              <CollapsibleContent className="pm-collapsible-animate overflow-hidden data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 data-[state=open]:slide-in-from-top-2 data-[state=closed]:slide-out-to-top-2 data-[state=open]:duration-200 data-[state=closed]:duration-150 mt-3 space-y-3 text-sm">
                {/* Equipment Image */}
                <div className="rounded-lg overflow-hidden border">
                  {equipment.image_url ? (
                    <img
                      src={equipment.image_url}
                      alt={equipment.name}
                      className="w-full h-40 object-cover"
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    <div className="w-full h-40 bg-muted flex items-center justify-center">
                      <Forklift className="h-12 w-12 text-muted-foreground" />
                    </div>
                  )}
                </div>

                {/* Location Map */}
                <div className="rounded-lg overflow-hidden border">
                  {(() => {
                    const hasCoords = effectiveLocation?.lat != null && effectiveLocation?.lng != null;

                    if (hasCoords && isMapsLoaded) {
                      const center = { lat: effectiveLocation!.lat!, lng: effectiveLocation!.lng! };
                      return (
                        <div className="flex flex-col h-40">
                          <div className="flex-1 min-h-0">
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
                          {effectiveLocation!.formattedAddress && (
                            <div className="flex items-center gap-1.5 px-2 py-1.5 bg-background min-h-[44px] touch-manipulation">
                              <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                              <ClickableAddress
                                address={effectiveLocation!.formattedAddress}
                                lat={effectiveLocation!.lat!}
                                lng={effectiveLocation!.lng!}
                                className="text-xs"
                              />
                            </div>
                          )}
                        </div>
                      );
                    }

                    if (hasCoords && !isMapsLoaded) {
                      return (
                        <div className="w-full h-40 bg-muted/50 flex items-center justify-center">
                          <div className="text-center">
                            <MapPin className="h-6 w-6 text-muted-foreground/50 mx-auto animate-pulse" />
                            <p className="text-xs text-muted-foreground mt-1">Loading map...</p>
                          </div>
                        </div>
                      );
                    }

                    if (equipment.location) {
                      return (
                        <div className="w-full h-40 bg-muted/50 flex items-center justify-center">
                          <div className="text-center px-4">
                            <MapPin className="h-6 w-6 text-muted-foreground/50 mx-auto" />
                            <p className="text-xs text-muted-foreground mt-1">{equipment.location}</p>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div className="w-full h-40 bg-muted/50 flex items-center justify-center">
                        <div className="text-center">
                          <MapPin className="h-6 w-6 text-muted-foreground/50 mx-auto" />
                          <p className="text-xs text-muted-foreground mt-1">No location set</p>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {equipment.manufacturer && equipment.model && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Model</span>
                    <span>{equipment.manufacturer} {equipment.model}</span>
                  </div>
                )}
                {equipment.serial_number && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Serial</span>
                    <span className="font-mono">{equipment.serial_number}</span>
                  </div>
                )}
                {workOrder.equipment_working_hours_at_creation && (
                  <div className="text-xs text-muted-foreground mt-2 p-2 bg-muted rounded">
                    Hours shown are from work order creation time
                  </div>
                )}
                {/* Custom attributes */}
                {equipment.custom_attributes && Object.keys(equipment.custom_attributes).length > 0 && (
                  <>
                    <div className="border-t my-2" />
                    {Object.entries(equipment.custom_attributes).map(([key, val]) => (
                      val != null && (
                        <div key={key} className="flex justify-between gap-4">
                          <span className="text-muted-foreground shrink-0">{humanizeAttributeKey(key)}</span>
                          <span className="text-right break-words">{humanizeAttributeValue(val)}</span>
                        </div>
                      )
                    ))}
                  </>
                )}
              </CollapsibleContent>
            </Collapsible>
          </CardContent>
        </Card>
      )}

      {onDeleteRequest && (
        <Card className="border-destructive/80 bg-destructive/[0.06] shadow-elevation-2 dark:bg-destructive/10">
          <CardContent className="p-4 space-y-3">
            <p className="text-sm font-semibold text-destructive">Delete Work Order</p>
            <p className="text-sm text-muted-foreground">
              This action permanently removes the work order and related records.
            </p>
            <Button
              type="button"
              variant="destructive"
              className="w-full min-h-[44px]"
              onClick={onDeleteRequest}
            >
              Delete Work Order
            </Button>
          </CardContent>
        </Card>
      )}

    </div>
  );
};

