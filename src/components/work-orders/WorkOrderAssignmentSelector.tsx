
import React, { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { User, UserMinus, Check, X } from 'lucide-react';
import { useWorkOrderContextualAssignment } from '@/hooks/useWorkOrderContextualAssignment';
import { useQuickWorkOrderAssignment } from '@/hooks/useQuickWorkOrderAssignment';

interface WorkOrderAssignmentSelectorProps {
  workOrder: any;
  organizationId: string;
  onCancel: () => void;
  disabled?: boolean;
}

const WorkOrderAssignmentSelector: React.FC<WorkOrderAssignmentSelectorProps> = ({
  workOrder,
  organizationId,
  onCancel,
  disabled = false
}) => {
  const [selectedValue, setSelectedValue] = useState<string>('');
  
  // Use contextual assignment based on equipment team assignment
  const { assignmentOptions, isLoading: optionsLoading, hasTeamAssignment } = useWorkOrderContextualAssignment(workOrder);
  const quickAssignmentMutation = useQuickWorkOrderAssignment();

  const handleAssign = () => {
    if (!selectedValue) return;

    if (selectedValue === 'unassign') {
      quickAssignmentMutation.mutate({
        workOrderId: workOrder.id,
        assigneeId: null,
        organizationId
      }, {
        onSuccess: () => {
          onCancel();
        }
      });
      return;
    }

    const option = assignmentOptions.find(opt => opt.id === selectedValue);
    if (!option) return;

    quickAssignmentMutation.mutate({
      workOrderId: workOrder.id,
      assigneeId: option.id,
      organizationId
    }, {
      onSuccess: () => {
        onCancel();
      }
    });
  };

  const getCurrentAssignmentValue = () => {
    if (workOrder.assignee_id) return workOrder.assignee_id;
    return '';
  };

  const isAssignmentChanged = selectedValue && selectedValue !== getCurrentAssignmentValue();

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium text-muted-foreground mb-2 block">
          Change Assignment
        </label>
        <Select
          value={selectedValue}
          onValueChange={setSelectedValue}
          disabled={disabled || optionsLoading || quickAssignmentMutation.isPending}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select new assignee..." />
          </SelectTrigger>
          <SelectContent>
            {/* Unassign option */}
            <SelectItem value="unassign">
              <div className="flex items-center gap-2">
                <UserMinus className="h-4 w-4 text-muted-foreground" />
                <span>Unassign</span>
              </div>
            </SelectItem>

            {/* User options */}
            {assignmentOptions.length > 0 && (
              <>
                <div className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide border-t">
                  {hasTeamAssignment ? 'Team Members' : 'Organization Admins'}
                </div>
                {assignmentOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    <div className="flex items-center gap-2 w-full">
                      <User className="h-4 w-4" />
                      <div className="flex-1">
                        <div className="flex items-center gap-1">
                          <span>{option.name}</span>
                          {workOrder.assignee_id === option.id && (
                            <Badge variant="outline" className="text-xs">Current</Badge>
                          )}
                        </div>
                        {option.email && (
                          <div className="text-xs text-muted-foreground">{option.email}</div>
                        )}
                      </div>
                      {option.role && (
                        <Badge variant="secondary" className="text-xs">
                          {option.role}
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </>
            )}
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-2">
        <Button
          onClick={handleAssign}
          disabled={!isAssignmentChanged || quickAssignmentMutation.isPending}
          size="sm"
          className="flex-1"
        >
          <Check className="h-4 w-4 mr-1" />
          {quickAssignmentMutation.isPending ? 'Updating...' : 'Update Assignment'}
        </Button>
        <Button
          onClick={onCancel}
          variant="outline"
          size="sm"
          disabled={quickAssignmentMutation.isPending}
        >
          <X className="h-4 w-4 mr-1" />
          Cancel
        </Button>
      </div>
    </div>
  );
};

export default WorkOrderAssignmentSelector;
