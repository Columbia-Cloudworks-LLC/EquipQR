import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { User, Users, Shield, AlertTriangle } from "lucide-react";
import { WorkOrderFormData } from '@/features/work-orders/hooks/useWorkOrderForm';
import { useWorkOrderAssignmentOptions } from '@/features/work-orders/hooks/useWorkOrderAssignment';
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
  const { assignmentOptions, isLoading: isLoadingMembers, error: assignmentError, equipmentHasNoTeam } = useWorkOrderAssignmentOptions(organizationId, equipmentId);
  
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

  // If equipment has no team, show a warning and disable assignment
  const isAssignmentBlocked = equipmentHasNoTeam && equipmentId;

  return (
    <Card>
      <CardContent className="pt-4 space-y-4">
        <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
          Assignment
        </h3>
        
        {isAssignmentBlocked ? (
          <Alert variant="default" className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800 dark:text-amber-200">
              This equipment has no team assigned. Assign a team to the equipment to enable work order assignments.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-2">
            <Label>Assignee</Label>
            <p className="text-xs text-muted-foreground">
              Assignable: equipment team members + organization admins
            </p>
            {assignmentError && (
              <p className="text-sm text-destructive">Error loading assignees: {assignmentError.message}</p>
            )}
            <Select
              value={values.assigneeId || 'unassigned'}
              onValueChange={handleAssigneeChange}
              disabled={isLoadingMembers}
            >
              <SelectTrigger>
                <SelectValue placeholder={isLoadingMembers ? "Loading..." : "Select assignee..."} />
              </SelectTrigger>
              <SelectContent>
                {/* Unassigned option */}
                <SelectItem value="unassigned">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>Unassigned</span>
                  </div>
                </SelectItem>
                
                {/* Assignee options */}
                {assignmentOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    <div className="flex items-center gap-2">
                      {option.role === 'owner' || option.role === 'admin' ? (
                        <Shield className="h-4 w-4" />
                      ) : (
                        <User className="h-4 w-4" />
                      )}
                      <div>
                        <span>{option.name}</span>
                        {option.role && (
                          <span className="text-xs text-muted-foreground ml-1">
                            ({option.role})
                          </span>
                        )}
                      </div>
                    </div>
                  </SelectItem>
                ))}
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



