
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Link } from 'react-router-dom';
import { Wrench, FileText, ChevronDown, MapPin, Forklift } from 'lucide-react';
import { GoogleMap, MarkerF } from '@react-google-maps/api';
import { Equipment } from '@/services/supabaseDataService';
import type { WorkOrder as EnhancedWorkOrder } from '@/features/work-orders/types/workOrder';
import { useIsMobile } from '@/hooks/use-mobile';
import { useGoogleMapsLoader } from '@/hooks/useGoogleMapsLoader';
import { useEquipmentCurrentWorkingHours } from '@/features/equipment/hooks/useEquipmentWorkingHours';
import ClickableAddress from '@/components/ui/ClickableAddress';
import type { EffectiveLocation } from '@/utils/effectiveLocation';

interface WorkOrderDetailsInfoProps {
  workOrder: EnhancedWorkOrder;
  equipment: Equipment | null;
  effectiveLocation?: EffectiveLocation | null;
}

const WorkOrderDetailsInfo: React.FC<WorkOrderDetailsInfoProps> = ({
  workOrder,
  equipment,
  effectiveLocation,
}) => {
  const isMobile = useIsMobile();
  const [isEquipmentExpanded, setIsEquipmentExpanded] = React.useState(true);
  const [isCompletionExpanded, setIsCompletionExpanded] = React.useState(!isMobile);
  const { isLoaded: isMapsLoaded } = useGoogleMapsLoader();
  
  // Get equipment working hours (current for reference)
  const { data: currentWorkingHours, isLoading: workingHoursLoading } = useEquipmentCurrentWorkingHours(
    equipment?.id || ''
  );
  
  // Use historical working hours from work order if available, otherwise show current
  const workingHours = workOrder.equipment_working_hours_at_creation ?? currentWorkingHours;

  return (
    <Card className="shadow-elevation-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Work Order Details
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Description */}
        <p className="text-muted-foreground leading-relaxed text-sm">
          {workOrder.description}
        </p>

        {/* Equipment Information - Collapsible on mobile */}
        {equipment && (
          <>
            <Separator />
            <Collapsible open={isEquipmentExpanded} onOpenChange={setIsEquipmentExpanded}>
              <CollapsibleTrigger className="flex items-center justify-between w-full group">
                <h3 className="font-semibold flex items-center gap-2">
                  <Wrench className="h-4 w-4" />
                  Equipment Information
                </h3>
                <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]:rotate-180" />
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-3 space-y-3">
                {/* Desktop: Equipment Image + Location Map */}
                {!isMobile && (
                  <div className="grid grid-cols-2 gap-4">
                    {/* Equipment Image */}
                    <div className="rounded-lg overflow-hidden border">
                      {equipment.image_url ? (
                        <img
                          src={equipment.image_url}
                          alt={equipment.name}
                          className="w-full h-48 object-cover"
                        />
                      ) : (
                        <div className="w-full h-48 bg-muted flex items-center justify-center">
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
                            <div className="flex flex-col h-48">
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
                            <div className="w-full h-48 bg-muted/50 flex items-center justify-center">
                              <div className="text-center">
                                <MapPin className="h-6 w-6 text-muted-foreground/50 mx-auto animate-pulse" />
                                <p className="text-xs text-muted-foreground mt-1">Loading map...</p>
                              </div>
                            </div>
                          );
                        }

                        if (equipment.location) {
                          return (
                            <div className="w-full h-48 bg-muted/50 flex items-center justify-center">
                              <div className="text-center px-4">
                                <MapPin className="h-6 w-6 text-muted-foreground/50 mx-auto" />
                                <p className="text-xs text-muted-foreground mt-1">{equipment.location}</p>
                              </div>
                            </div>
                          );
                        }

                        return (
                          <div className="w-full h-48 bg-muted/50 flex items-center justify-center">
                            <div className="text-center">
                              <MapPin className="h-6 w-6 text-muted-foreground/50 mx-auto" />
                              <p className="text-xs text-muted-foreground mt-1">No location set</p>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <Link 
                    to={`/dashboard/equipment/${equipment.id}`}
                    className="text-lg font-medium text-primary hover:underline break-words"
                  >
                    {equipment.name}
                  </Link>
                  <Badge variant="outline" className={`
                    w-fit
                    ${equipment.status === 'active' ? 'border-green-200 text-green-800' :
                    equipment.status === 'maintenance' ? 'border-yellow-200 text-yellow-800' :
                    'border-red-200 text-red-800'}
                  `}>
                    {equipment.status}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Manufacturer:</span>
                    <span className="ml-2 text-muted-foreground break-words">{equipment.manufacturer}</span>
                  </div>
                  <div>
                    <span className="font-medium">Model:</span>
                    <span className="ml-2 text-muted-foreground break-words">{equipment.model}</span>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="font-medium">Serial Number:</span>
                    <span className="ml-2 text-muted-foreground break-words">{equipment.serial_number}</span>
                  </div>
                  <div className="sm:col-span-2">
                    <div className="flex items-start gap-1">
                      <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <span className="font-medium mr-1">Location:</span>
                      {effectiveLocation ? (
                        <ClickableAddress
                          address={effectiveLocation.formattedAddress}
                          lat={effectiveLocation.lat}
                          lng={effectiveLocation.lng}
                          className="text-sm break-words"
                        />
                      ) : equipment.location ? (
                        <ClickableAddress
                          address={equipment.location}
                          className="text-sm break-words"
                        />
                      ) : (
                        <span className="text-muted-foreground text-sm">No location set</span>
                      )}
                    </div>
                  </div>
                  
                  {/* Working Hours - standard data label */}
                  <div className="sm:col-span-2">
                    <span className="font-medium">
                      {workOrder.equipment_working_hours_at_creation ? 'Working Hours (at creation):' : 'Working Hours:'}
                    </span>
                    <span className="ml-2 text-muted-foreground break-words">
                      {workingHoursLoading ? (
                        <span className="animate-pulse">Loading...</span>
                      ) : (
                        `${workingHours?.toLocaleString() || 0} hrs`
                      )}
                    </span>
                    {workOrder.equipment_working_hours_at_creation && (
                      <span className="text-xs text-muted-foreground ml-1">(historical snapshot)</span>
                    )}
                  </div>

                  {/* Custom Attributes */}
                  {equipment.custom_attributes && typeof equipment.custom_attributes === 'object' && !Array.isArray(equipment.custom_attributes) && Object.keys(equipment.custom_attributes).length > 0 && (
                    <>
                      <div className="sm:col-span-2 border-t pt-3 mt-1" />
                      {Object.entries(equipment.custom_attributes as Record<string, unknown>).map(([key, val]) => (
                        val != null && (
                          <div key={key}>
                            <span className="font-medium">{key}:</span>
                            <span className="ml-2 text-muted-foreground break-words">{String(val)}</span>
                          </div>
                        )
                      ))}
                    </>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </>
        )}

        {workOrder.completed_date && (
          <>
            <Separator />
            <Collapsible open={isCompletionExpanded} onOpenChange={setIsCompletionExpanded}>
              <CollapsibleTrigger className="flex items-center justify-between w-full group">
                <h3 className="font-semibold">Completion Details</h3>
                <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]:rotate-180" />
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2">
                <p className="text-sm text-muted-foreground">
                  Completed on {new Date(workOrder.completed_date).toLocaleDateString()} at{' '}
                  {new Date(workOrder.completed_date).toLocaleTimeString()}
                </p>
              </CollapsibleContent>
            </Collapsible>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default WorkOrderDetailsInfo;
