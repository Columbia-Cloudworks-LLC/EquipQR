
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Link } from 'react-router-dom';
import { Wrench, FileText, ChevronDown } from 'lucide-react';
import type { EquipmentWithTeam } from '@/features/equipment/services/EquipmentService';
import type { WorkOrder as EnhancedWorkOrder, WorkOrderEmbeddedEquipment } from '@/features/work-orders/types/workOrder';
import { useIsMobile } from '@/hooks/use-mobile';
import { useEquipmentCurrentWorkingHours } from '@/features/equipment/hooks/useEquipmentWorkingHours';
import { humanizeAttributeKey, humanizeAttributeValue } from '@/features/work-orders/utils/workOrderHelpers';
import { useFormatTimestamp } from '@/hooks/useFormatTimestamp';
import InlineEditField from '@/features/equipment/components/InlineEditField';
import { EquipmentLocationMapPanel } from '@/components/location/EquipmentLocationMapPanel';
import { EquipmentPrimaryMediaPanel } from '@/features/equipment/components/media/EquipmentPrimaryMediaPanel';
import {
  toWorkOrderEquipmentMapInput,
  toWorkOrderEquipmentTeamSummary,
} from '@/components/location/workOrderEquipmentLocationContext';

import type { EquipmentLocationEditProps } from '@/components/location/equipmentLocationEditProps';

type WorkOrderDetailsEquipment = WorkOrderEmbeddedEquipment | EquipmentWithTeam;

interface WorkOrderDetailsInfoProps {
  workOrder: EnhancedWorkOrder;
  equipment: WorkOrderDetailsEquipment | null;
  organizationId: string;
  scanLocationCollectionEnabled?: boolean;
  canEditDescription?: boolean;
  onSaveDescription?: (description: string) => Promise<void>;
  equipmentLocationEdit?: EquipmentLocationEditProps;
}

const WorkOrderDetailsInfo: React.FC<WorkOrderDetailsInfoProps> = ({
  workOrder,
  equipment,
  organizationId,
  scanLocationCollectionEnabled,
  canEditDescription = false,
  onSaveDescription,
  equipmentLocationEdit,
}) => {
  const { formatDateTime } = useFormatTimestamp();
  const isMobile = useIsMobile();
  const [isEquipmentExpanded, setIsEquipmentExpanded] = React.useState(true);
  const [isCompletionExpanded, setIsCompletionExpanded] = React.useState(!isMobile);

  const { data: currentWorkingHours, isLoading: workingHoursLoading } = useEquipmentCurrentWorkingHours(
    equipment?.id || '',
  );

  const workingHours = workOrder.equipment_working_hours_at_creation ?? currentWorkingHours;
  const equipmentMapInput = equipment ? toWorkOrderEquipmentMapInput(equipment) : null;
  const assignedTeam = equipment ? toWorkOrderEquipmentTeamSummary(equipment) : null;

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
        {canEditDescription && onSaveDescription ? (
          <InlineEditField
            value={workOrder.description ?? ''}
            onSave={onSaveDescription}
            canEdit={canEditDescription}
            type="textarea"
            placeholder="Add a work order description"
            className="text-sm text-muted-foreground leading-relaxed"
            editAriaLabel="Edit description"
          />
        ) : (
          <p className="text-muted-foreground leading-relaxed text-sm">
            {workOrder.description}
          </p>
        )}

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
                    <div className="overflow-hidden rounded-lg border p-2">
                      <EquipmentPrimaryMediaPanel
                        equipmentId={equipment.id}
                        organizationId={organizationId}
                        equipmentName={equipment.name}
                        currentDisplayImage={equipment.image_url}
                        emptyClassName="h-48"
                      />
                    </div>

                    {equipmentMapInput ? (
                      <EquipmentLocationMapPanel
                        equipment={equipmentMapInput}
                        assignedTeam={assignedTeam}
                        organizationId={organizationId}
                        scanLocationCollectionEnabled={scanLocationCollectionEnabled}
                        mapHeight="192px"
                        {...equipmentLocationEdit}
                      />
                    ) : null}
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
                    ${equipment.status === 'active' ? 'border-success/30 text-success' :
                    equipment.status === 'maintenance' ? 'border-warning/30 text-warning' :
                    'border-destructive/30 text-destructive'}
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
                  {/* Working Hours - standard data label */}
                  <div className="sm:col-span-2">
                    <span className="font-medium">
                      {workOrder.equipment_working_hours_at_creation ? 'Meter Reading (at creation):' : 'Equipment Hours:'}
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
                            <span className="font-medium">{humanizeAttributeKey(key)}:</span>
                            <span className="ml-2 text-muted-foreground break-words">{humanizeAttributeValue(val)}</span>
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
                  Completed on {formatDateTime(workOrder.completed_date)}
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

