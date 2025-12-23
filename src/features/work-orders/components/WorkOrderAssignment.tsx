import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { User, Users } from "lucide-react";
import { WorkOrderFormData } from '@/features/work-orders/hooks/useWorkOrderForm';
import { useWorkOrderAssignmentOptions } from '@/features/work-orders/hooks/useWorkOrderAssignment';
import { logger } from '@/utils/logger';

interface WorkOrderAssignmentProps {
  values: Pick<WorkOrderFormData, 'assignmentType' | 'assignmentId'>;
  errors: Partial<Record<'assignmentType' | 'assignmentId', string>>;
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
  const { assignmentOptions, isLoading: isLoadingMembers, error: assignmentError } = useWorkOrderAssignmentOptions(organizationId, equipmentId);
  
  // Debug logging
  React.useEffect(() => {
    logger.debug('[WorkOrderAssignment] Component state:', {
      organizationId,
      equipmentId,
      assignmentOptionsCount: assignmentOptions.length,
      isLoading: isLoadingMembers,
      error: assignmentError,
      assignmentOptions: assignmentOptions.slice(0, 3) // First 3 for debugging
    });
  }, [organizationId, equipmentId, assignmentOptions, isLoadingMembers, assignmentError]);

  const assignmentType = values.assignmentType || 'unassigned';

  const handleAssignmentTypeChange = (type: 'unassigned' | 'user') => {
    setValue('assignmentType', type);
    // Clear assignment ID when switching types
    setValue('assignmentId', null);
  };

  const handleAssigneeChange = (userId: string) => {
    setValue('assignmentId', userId);
  };

  return (
    <Card>
      <CardContent className="pt-4 space-y-4">
        <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
          Assignment
        </h3>
        
        <div className="space-y-2">
          <Label>Assignment Type</Label>
          <Select 
            value={assignmentType}
            onValueChange={handleAssignmentTypeChange}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select assignment type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unassigned">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  Unassigned
                </div>
              </SelectItem>
              <SelectItem value="user">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Assign to User
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
          {errors.assignmentType && (
            <p className="text-sm text-destructive">{errors.assignmentType}</p>
          )}
        </div>

        {assignmentType === 'user' && (
          <div className="space-y-2">
            <Label>Assignee</Label>
            {assignmentError && (
              <p className="text-sm text-destructive">Error loading assignees: {assignmentError.message}</p>
            )}
            <Select
              value={values.assignmentId || ''}
              onValueChange={handleAssigneeChange}
              disabled={isLoadingMembers}
            >
              <SelectTrigger>
                <SelectValue placeholder={isLoadingMembers ? "Loading..." : assignmentOptions.length === 0 ? "No assignees available" : "Select assignee..."} />
              </SelectTrigger>
              <SelectContent>
                {assignmentOptions.length === 0 && !isLoadingMembers ? (
                  <div className="px-2 py-1.5 text-sm text-muted-foreground">
                    No assignees available
                  </div>
                ) : (
                  assignmentOptions.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
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
                  ))
                )}
              </SelectContent>
            </Select>
            {assignmentOptions.length === 0 && !isLoadingMembers && (
              <p className="text-sm text-muted-foreground">No team members available</p>
            )}
            {errors.assignmentId && (
              <p className="text-sm text-destructive">{errors.assignmentId}</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};



