import React, { useState, useCallback } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { User, UserX, Shield } from 'lucide-react';
import { useWorkOrderContextualAssignment, type AssignmentWorkOrderContext } from '@/hooks/useWorkOrderContextualAssignment';
import { useQuickWorkOrderAssignment } from '@/hooks/useQuickWorkOrderAssignment';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger';

interface WorkOrderAssignmentHoverProps {
  workOrder: AssignmentWorkOrderContext;
  children: React.ReactNode;
  disabled?: boolean;
}

export const WorkOrderAssignmentHover: React.FC<WorkOrderAssignmentHoverProps> = ({
  workOrder,
  children,
  disabled = false
}) => {
  const { toast } = useToast();
  const [isAssigning, setIsAssigning] = useState(false);
  
  const { assignmentOptions, isLoading, hasTeamAssignment } = useWorkOrderContextualAssignment(workOrder);
  const assignmentMutation = useQuickWorkOrderAssignment();

  const handleAssignment = useCallback(async (assignmentData: { type: 'assign' | 'unassign'; id?: string }) => {
    if (isAssigning) return;
    
    setIsAssigning(true);
    try {
      let assigneeId = null;
      
      if (assignmentData.type === 'assign') {
        assigneeId = assignmentData.id;
      }
      const organizationId = workOrder.organization_id ?? workOrder.organizationId;
      if (!organizationId) {
        toast({
          title: "Missing organization",
          description: "Cannot update assignment without an organization context.",
          variant: "destructive",
        });
        return;
      }
      
      await assignmentMutation.mutateAsync({
        workOrderId: workOrder.id,
        assigneeId,
        organizationId
      });
      
      toast({
        title: "Assignment Updated",
        description: assignmentData.type === 'unassign' 
          ? "Work order unassigned successfully"
          : `Work order assigned successfully`,
      });
    } catch (error) {
      logger.error('Failed to update assignment', error);
      toast({
        title: "Error",
        description: "Failed to update assignment",
        variant: "destructive",
      });
    } finally {
      setIsAssigning(false);
    }
  }, [assignmentMutation, isAssigning, toast, workOrder.id, workOrder.organizationId, workOrder.organization_id]);

  if (disabled) return <>{children}</>;

  return (
    <Popover>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4" side="top">
        <div className="space-y-3">
          <div className="text-sm font-medium">Quick Assignment</div>
          
          {isLoading || assignmentOptions.length === 0 ? (
            <div className="text-xs text-muted-foreground">
              {isLoading ? 'Loading options...' : 'No assignees available'}
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <div className="text-xs text-muted-foreground">
                  {hasTeamAssignment ? 'Assign to team members' : 'Assign to organization admins'}
                </div>
                <Select 
                  onValueChange={(value) => {
                    handleAssignment({ type: 'assign', id: value });
                  }}
                  disabled={isAssigning}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder="Select assignee..." />
                  </SelectTrigger>
                  <SelectContent>
                    {assignmentOptions.map((assignee) => (
                      <SelectItem key={assignee.id} value={assignee.id}>
                        <div className="flex items-center gap-2">
                          {assignee.role === 'owner' || assignee.role === 'admin' ? (
                            <Shield className="h-3 w-3" />
                          ) : (
                            <User className="h-3 w-3" />
                          )}
                          <span>{assignee.name}</span>
                          {assignee.role && (
                            <span className="text-xs text-muted-foreground">({assignee.role})</span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => handleAssignment({ type: 'unassign' })}
                disabled={isAssigning}
                className="w-full h-8"
              >
                <UserX className="h-3 w-3 mr-1" />
                Unassign
              </Button>
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};