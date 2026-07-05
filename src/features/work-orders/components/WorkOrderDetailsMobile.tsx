import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp, Clipboard, Clock, Wrench, Forklift, MapPin, Users } from 'lucide-react';
import { getStatusDisplayInfo as getEquipmentStatusDisplayInfo } from '@/features/equipment/utils/equipmentHelpers';
import { cn } from '@/lib/utils';
import { useEquipmentCurrentWorkingHours } from '@/features/equipment/hooks/useEquipmentWorkingHours';
import { humanizeAttributeKey, humanizeAttributeValue } from '@/features/work-orders/utils/workOrderHelpers';
import type { EffectiveLocation } from '@/utils/effectiveLocation';
import InlineEditField from '@/features/equipment/components/InlineEditField';
import { EquipmentLocationMapPanel } from '@/components/location/EquipmentLocationMapPanel';
import type { EquipmentLocationEditProps } from '@/components/location/equipmentLocationEditProps';
import {
  toWorkOrderEquipmentMapInput,
  toWorkOrderEquipmentTeamSummary,
  type WorkOrderLocationEquipment,
} from '@/components/location/workOrderEquipmentLocationContext';

type FieldContextItemProps = {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
  className?: string;
};

function FieldContextItem({ icon, label, children, className }: FieldContextItemProps) {
  return (
    <div className={cn('flex gap-3', className)}>
      <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center text-muted-foreground">{icon}</div>
      <div className="min-w-0 flex-1 space-y-0.5">
        <p className="text-sm font-medium leading-none text-foreground">{label}</p>
        <div className="text-sm leading-snug">{children}</div>
      </div>
    </div>
  );
}

function FieldContextNestedItem({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="ml-8 flex min-w-0 items-baseline gap-2 text-xs leading-snug">
      <span className="shrink-0 text-muted-foreground/80" aria-hidden>
        ↳
      </span>
      <span className="shrink-0 font-medium text-muted-foreground">{label}</span>
      <span className="min-w-0">{children}</span>
    </div>
  );
}

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
  equipment?: WorkOrderLocationEquipment;
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
  organizationId: string;
  scanLocationCollectionEnabled?: boolean;
  /** Resolved effective location for compact summary text */
  effectiveLocation?: EffectiveLocation | null;
  canEditDescription?: boolean;
  onSaveDescription?: (description: string) => Promise<void>;
  equipmentLocationEdit?: EquipmentLocationEditProps;
}

interface LocationMapProps {
  equipment: WorkOrderLocationEquipment;
  organizationId: string;
  scanLocationCollectionEnabled?: boolean;
  equipmentLocationEdit?: EquipmentLocationEditProps;
}

const LocationMap: React.FC<LocationMapProps> = ({
  equipment,
  organizationId,
  scanLocationCollectionEnabled,
  equipmentLocationEdit,
}) => {
  const equipmentMapInput = toWorkOrderEquipmentMapInput(equipment);
  const assignedTeam = toWorkOrderEquipmentTeamSummary(equipment);

  if (!equipmentMapInput) {
    return null;
  }

  return (
    <EquipmentLocationMapPanel
      equipment={equipmentMapInput}
      assignedTeam={assignedTeam}
      organizationId={organizationId}
      scanLocationCollectionEnabled={scanLocationCollectionEnabled}
      mapHeight="160px"
      {...equipmentLocationEdit}
    />
  );
};

export const WorkOrderDetailsMobile: React.FC<WorkOrderDetailsMobileProps> = ({
  workOrder,
  equipment,
  team,
  effectiveLocation,
  organizationId,
  scanLocationCollectionEnabled,
  canEditDescription = false,
  onSaveDescription,
  equipmentLocationEdit,
}) => {
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [isEquipmentDetailsExpanded, setIsEquipmentDetailsExpanded] = useState(false);

  const { data: currentWorkingHours, isLoading: workingHoursLoading } = useEquipmentCurrentWorkingHours(
    equipment?.id || '',
  );

  const workingHours = workOrder.equipment_working_hours_at_creation ?? currentWorkingHours;

  const locationSummary = effectiveLocation?.formattedAddress?.trim() || '';

  const equipStatus =
    equipment != null ? getEquipmentStatusDisplayInfo(equipment.status || 'active') : null;

  return (
    <div className="space-y-3">
      <Card className="shadow-elevation-2 border-l-4 border-l-primary">
        <CardContent className="p-4">
          <div className="divide-y divide-border/50">
            {equipment ? (
              <div className="space-y-2 py-3">
                <FieldContextItem icon={<Forklift className="h-4 w-4" aria-hidden />} label="Equipment">
                  <Link
                    to={`/dashboard/equipment/${equipment.id}`}
                    className="font-semibold text-primary underline-offset-4 hover:underline"
                  >
                    {equipment.name}
                  </Link>
                </FieldContextItem>
                {equipStatus ? (
                  <FieldContextNestedItem label="Status">
                    <span className={cn('font-medium', equipStatus.textClassName)}>{equipStatus.label}</span>
                  </FieldContextNestedItem>
                ) : null}
              </div>
            ) : null}

            {team ? (
              <div className="py-3">
                <FieldContextItem icon={<Users className="h-4 w-4" aria-hidden />} label="Team">
                  <Link to={`/dashboard/teams/${team.id}`} className="font-semibold text-primary hover:underline">
                    {team.name}
                  </Link>
                </FieldContextItem>
              </div>
            ) : null}

            {locationSummary ? (
              <div className="py-3">
                <FieldContextItem icon={<MapPin className="h-4 w-4" aria-hidden />} label="Location">
                  <span className="text-muted-foreground">{locationSummary}</span>
                </FieldContextItem>
              </div>
            ) : null}

            {workOrder.estimated_hours != null ? (
              <div className="py-3">
                <FieldContextItem icon={<Clock className="h-4 w-4" aria-hidden />} label="Estimated">
                  <span className="text-muted-foreground">{workOrder.estimated_hours}h</span>
                </FieldContextItem>
              </div>
            ) : null}

            <div className="py-3">
              <FieldContextItem
                icon={<Wrench className="h-4 w-4" aria-hidden />}
                label={workOrder.equipment_working_hours_at_creation ? 'Meter at creation' : 'Equipment hours'}
              >
                <span className="text-muted-foreground">
                  {workingHoursLoading ? (
                    <span className="animate-pulse">...</span>
                  ) : (
                    `${workingHours?.toLocaleString() || 0} hrs`
                  )}
                </span>
              </FieldContextItem>
            </div>
          </div>
        </CardContent>
      </Card>

      {workOrder.description || canEditDescription ? (
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
                {canEditDescription && onSaveDescription ? (
                  <InlineEditField
                    value={workOrder.description ?? ''}
                    onSave={onSaveDescription}
                    canEdit={canEditDescription}
                    type="textarea"
                    placeholder="Add a work order description"
                    className="w-full text-[15px] leading-relaxed text-foreground/80"
                    editAriaLabel="Edit description"
                  />
                ) : (
                  <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-foreground/80">{workOrder.description}</p>
                )}
              </CollapsibleContent>
            </Collapsible>
            {!isDescriptionExpanded && workOrder.description && workOrder.description.length > 100 ? (
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
                  <LocationMap
                    equipment={equipment}
                    organizationId={organizationId}
                    scanLocationCollectionEnabled={scanLocationCollectionEnabled}
                    equipmentLocationEdit={equipmentLocationEdit}
                  />
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
