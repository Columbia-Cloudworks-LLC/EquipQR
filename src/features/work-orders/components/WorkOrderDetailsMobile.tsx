import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  ChevronDown, 
  ChevronUp, 
  Calendar, 
  User,
  Clock,
  ExternalLink,
  Clipboard,
  AlertCircle,
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
}

/** Check if a due date is urgent (within 24 hours or overdue) */
const isDueUrgent = (dueDate: string): boolean => {
  const due = new Date(dueDate);
  const now = new Date();
  const hoursUntilDue = (due.getTime() - now.getTime()) / (1000 * 60 * 60);
  return hoursUntilDue < 24;
};

export const WorkOrderDetailsMobile: React.FC<WorkOrderDetailsMobileProps> = ({
  workOrder,
  equipment,
  assignee,
  effectiveLocation,
  onScrollToPM,
}) => {
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
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

  // Check if due date is urgent
  const dueUrgent = workOrder.due_date ? isDueUrgent(workOrder.due_date) : false;

  return (
    <div className="space-y-3">
      {/* Top Summary Card — unique data not in mobile header */}
      <Card className="shadow-elevation-2 border-l-4 border-l-primary">
        <CardContent className="p-4 space-y-3">
          {/* Assignee */}
          {assignee && (
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Assigned to:</span>
              <span className="text-muted-foreground">{assignee.name}</span>
            </div>
          )}

          {/* Due Date */}
          {workOrder.due_date && (
            <div className={cn(
              "flex items-center gap-2 text-sm",
              dueUrgent && "text-red-600 dark:text-red-400"
            )}>
              <Clock className="h-4 w-4" />
              <span className="font-medium">Due:</span>
              <span>{new Date(workOrder.due_date).toLocaleDateString()}</span>
              {dueUrgent && <AlertCircle className="h-4 w-4" />}
            </div>
          )}

          {/* Estimated Hours */}
          {workOrder.estimated_hours != null && (
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Estimated:</span>
              <span className="text-muted-foreground">{workOrder.estimated_hours}h</span>
            </div>
          )}

          {/* Working Hours — standard data label, de-emphasized */}
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">
              {workOrder.equipment_working_hours_at_creation ? 'Hours (at creation):' : 'Working Hours:'}
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
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Wrench className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Equipment:</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1 text-primary"
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
            workOrder.pm_status === 'completed' && "border-green-200 dark:border-green-800"
          )}
          onClick={onScrollToPM ? () => onScrollToPM() : undefined}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Clipboard className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium text-sm">PM Checklist</span>
              </div>
              <div className="flex items-center gap-2">
                {workOrder.pm_status === 'completed' ? (
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Complete
                  </Badge>
                ) : (
                  <span className="text-sm text-muted-foreground">
                    {workOrder.pm_progress || 0} / {workOrder.pm_total || 0}
                  </span>
                )}
              </div>
            </div>
            <Progress value={pmProgressPercent} className="h-2" />
            <p className="text-xs text-muted-foreground mt-2">
              Tap to view and complete checklist items
            </p>
          </CardContent>
        </Card>
      )}

      {/* Description - Collapsible */}
      {workOrder.description && (
        <Card className="shadow-elevation-2">
          <CardContent className="p-4">
            <Collapsible open={isDescriptionExpanded} onOpenChange={setIsDescriptionExpanded}>
              <CollapsibleTrigger asChild>
                <button className="flex items-center justify-between w-full text-left">
                  <span className="font-medium text-sm">Description</span>
                  {isDescriptionExpanded ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-3">
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {workOrder.description}
                </p>
              </CollapsibleContent>
            </Collapsible>
            {!isDescriptionExpanded && workOrder.description.length > 100 && (
              <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                {workOrder.description}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Equipment Details - Collapsible */}
      {equipment && (
        <Card className="shadow-elevation-2">
          <CardContent className="p-4">
            <Collapsible open={isEquipmentDetailsExpanded} onOpenChange={setIsEquipmentDetailsExpanded}>
              <CollapsibleTrigger asChild>
                <button className="flex items-center justify-between w-full text-left">
                  <span className="font-medium text-sm">Equipment Details</span>
                  {isEquipmentDetailsExpanded ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-3 space-y-3 text-sm">
                {/* Equipment Image */}
                <div className="rounded-lg overflow-hidden border">
                  {equipment.image_url ? (
                    <img
                      src={equipment.image_url}
                      alt={equipment.name}
                      className="w-full h-40 object-cover"
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
                            <div className="flex items-start gap-1.5 px-2 py-1.5 bg-background">
                              <MapPin className="h-3.5 w-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
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
                          <span className="text-muted-foreground shrink-0">{key}</span>
                          <span className="text-right break-words">{String(val)}</span>
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

      {/* Quick Info Row */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
        <Calendar className="h-3 w-3" />
        <span>Created: {workOrder.created_at ? new Date(workOrder.created_at).toLocaleDateString() : 'N/A'}</span>
        <span className="mx-1">•</span>
        <span>ID: {workOrder.id.slice(0, 8)}...</span>
      </div>
    </div>
  );
};
