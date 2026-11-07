import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Users, AlertTriangle, Info } from "lucide-react";
import { WorkOrderFormData } from '@/features/work-orders/hooks/useWorkOrderForm';
import { useWorkOrderAssignmentOptions } from '@/features/work-orders/hooks/useWorkOrderAssignment';
import { WorkOrderAssigneeSelectItems } from '@/features/work-orders/components/WorkOrderAssigneeSelectItems';
import { logger } from '@/utils/logger';

interface WorkOrderAssignmentProps {
  values: Pick<WorkOrderFormData, 'assigneeId'>;
  errors: Partial<Record<'assigneeId', string>>;
  setValue: <K extends keyof WorkOrderFormData>(field: K, value: WorkOrderFormData[K]) => void;
  organizationId: string;
  equipmentId?: string;
}

export const WorkOrderAssignment: React.FC<WorkOrderAssignmentProps> = ({
  values,
  errors,
  setValue,
  organizationId,
  equipmentId
}) => {
  const { assignmentOptions, isLoading: isLoadingMembers, error: assignmentError, equipmentHasNoTeam, teamName } = useWorkOrderAssignmentOptions(organizationId, equipmentId);
  
  // Debug logging
  React.useEffect(() => {
    logger.debug('[WorkOrderAssignment] Component state:', {
      organizationId,
      equipmentId,
      assignmentOptionsCount: assignmentOptions.length,
      isLoading: isLoadingMembers,
      error: assignmentError,
      equipmentHasNoTeam,
      assignmentOptions: assignmentOptions.slice(0, 3) // First 3 for debugging
    });
  }, [organizationId, equipmentId, assignmentOptions, isLoadingMembers, assignmentError, equipmentHasNoTeam]);

  const handleAssigneeChange = (userId: string) => {
    // "unassigned" is a special value meaning no assignee
    setValue('assigneeId', userId === 'unassigned' ? null : userId);
  };

  // Show eligibility as groups in the list instead of explaining it in a hint.
  const adminOptions = assignmentOptions.filter((option) => option.role === 'owner' || option.role === 'admin');
  const teamOptions = assignmentOptions.filter((option) => option.role !== 'owner' && option.role !== 'admin');
  const needsEquipment = !equipmentId;

  // If equipment has no team, show a warning and disable assignment
  const isAssignmentBlocked = equipmentHasNoTeam && equipmentId;

  return (
    <Card>
      <CardContent className="pt-4 space-y-4">
        <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
          Assignment
        </h3>
        
        {teamName && (
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <Label className="text-muted-foreground">Team</Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3.5 w-3.5 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>Team is inherited from the selected equipment</TooltipContent>
              </Tooltip>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 rounded-md border bg-muted/40 text-sm">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span>{teamName}</span>
            </div>
          </div>
        )}

        {isAssignmentBlocked ? (
          <Alert variant="default" className="border-warning/30 bg-warning/10 dark:border-warning/50 dark:bg-warning/15">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <AlertDescription className="text-warning dark:text-warning">
              This equipment has no team assigned. Assign a team to the equipment to enable work order assignments.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-2">
            <Label htmlFor="work-order-assignee">Assignee</Label>
            {assignmentError && (
              <p className="text-sm text-destructive">Error loading assignees: {assignmentError.message}</p>
            )}
            <Select
              value={needsEquipment ? '' : values.assigneeId || 'unassigned'}
              onValueChange={handleAssigneeChange}
              disabled={needsEquipment || isLoadingMembers}
            >
              <SelectTrigger id="work-order-assignee">
                <SelectValue
                  placeholder={needsEquipment ? 'Choose equipment first' : isLoadingMembers ? 'Loading...' : 'Select assignee...'}
                />
              </SelectTrigger>
              <SelectContent>
                {/* Unassigned option */}
                <SelectItem value="unassigned">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>Unassigned</span>
                  </div>
                </SelectItem>
                
                {teamOptions.length > 0 && (
                  <SelectGroup>
                    <SelectLabel>{teamName ?? 'Equipment team'}</SelectLabel>
                    <WorkOrderAssigneeSelectItems options={teamOptions} />
                  </SelectGroup>
                )}
                {adminOptions.length > 0 && (
                  <SelectGroup>
                    <SelectLabel>Admins</SelectLabel>
                    <WorkOrderAssigneeSelectItems options={adminOptions} />
                  </SelectGroup>
                )}
              </SelectContent>
            </Select>
            {errors.assigneeId && (
              <p className="text-sm text-destructive">{errors.assigneeId}</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};




