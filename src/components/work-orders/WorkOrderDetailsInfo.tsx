
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Link } from 'react-router-dom';
import { Wrench, FileText, ChevronDown, Clock } from 'lucide-react';
import { Equipment } from '@/services/supabaseDataService';
import type { WorkOrder as EnhancedWorkOrder } from '@/types/workOrder';
import { useIsMobile } from '@/hooks/use-mobile';
import { useEquipmentCurrentWorkingHours } from '@/components/equipment/hooks/useEquipmentWorkingHours';

interface WorkOrderDetailsInfoProps {
  workOrder: EnhancedWorkOrder;
  equipment: Equipment | null;
}

const WorkOrderDetailsInfo: React.FC<WorkOrderDetailsInfoProps> = ({
  workOrder,
  equipment,
}) => {
  const isMobile = useIsMobile();
  const [isEquipmentExpanded, setIsEquipmentExpanded] = React.useState(true);
  const [isCompletionExpanded, setIsCompletionExpanded] = React.useState(!isMobile);
  
  // Get equipment working hours (current for reference)
  const { data: currentWorkingHours, isLoading: workingHoursLoading } = useEquipmentCurrentWorkingHours(
    equipment?.id || ''
  );
  
  // Use historical working hours from work order if available, otherwise show current
  const workingHours = workOrder.equipment_working_hours_at_creation ?? currentWorkingHours;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Work Order Details
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Description */}
        <div>
          <h3 className="font-semibold mb-2">Description</h3>
          <p className="text-muted-foreground leading-relaxed text-sm">
            {workOrder.description}
          </p>
        </div>

        <Separator />

        {/* Equipment Information - Collapsible on mobile */}
        {equipment && (
          <Collapsible open={isEquipmentExpanded} onOpenChange={setIsEquipmentExpanded}>
            <CollapsibleTrigger className="flex items-center justify-between w-full group">
              <h3 className="font-semibold flex items-center gap-2">
                <Wrench className="h-4 w-4" />
                Equipment Information
              </h3>
              <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]:rotate-180" />
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3">
              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
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
                    <span className="font-medium">Location:</span>
                    <span className="ml-2 text-muted-foreground break-words">{equipment.location}</span>
                  </div>
                  
                  {/* Working Hours KPI */}
                  <div className="sm:col-span-2">
                    <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                      <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-blue-900 dark:text-blue-100">
                            {workOrder.equipment_working_hours_at_creation ? 'Working Hours (at creation):' : 'Working Hours:'}
                          </span>
                          <span className="text-blue-700 dark:text-blue-300 font-semibold">
                            {workingHoursLoading ? (
                              <span className="animate-pulse">Loading...</span>
                            ) : (
                              `${workingHours?.toLocaleString() || 0} hrs`
                            )}
                          </span>
                        </div>
                        {workOrder.equipment_working_hours_at_creation && (
                          <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                            Historical snapshot from work order creation
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
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
