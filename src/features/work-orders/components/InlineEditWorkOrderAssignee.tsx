import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Check, Edit2, User, UserMinus, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWorkOrderContextualAssignment, type AssignmentWorkOrderContext } from '@/features/work-orders/hooks/useWorkOrderContextualAssignment';
import { useQuickWorkOrderAssignment } from '@/hooks/useQuickWorkOrderAssignment';
import {
  inlineEditIconClassName,
  mobileInlineEditRowClassName,
  mobileInlineEditValueClassName,
} from '@/features/equipment/components/inlineEditStyles';
import type { WorkOrderStatus } from '@/features/work-orders/types/workOrder';

type InlineEditWorkOrderAssigneeProps = {
  workOrder: AssignmentWorkOrderContext & {
    assignee_id?: string | null;
    assigneeName?: string | null;
    status: WorkOrderStatus;
  };
  organizationId: string;
  canEdit: boolean;
  className?: string;
};

export function InlineEditWorkOrderAssignee({
  workOrder,
  organizationId,
  canEdit,
  className,
}: InlineEditWorkOrderAssigneeProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [selectedValue, setSelectedValue] = useState('');
  const { assignmentOptions, isLoading, equipmentHasNoTeam } = useWorkOrderContextualAssignment(workOrder);
  const assignmentMutation = useQuickWorkOrderAssignment();

  const currentAssigneeId = workOrder.assignee_id ?? '';
  const displayName = workOrder.assigneeName?.trim() || 'Unassigned';

  const handleSave = async () => {
    if (!selectedValue || selectedValue === currentAssigneeId) {
      setIsEditing(false);
      return;
    }

    const assigneeId = selectedValue === 'unassign' ? null : selectedValue;
    await assignmentMutation.mutateAsync({
      workOrderId: workOrder.id,
      assigneeId,
      organizationId,
      currentStatus: workOrder.status,
    });
    setIsEditing(false);
    setSelectedValue('');
  };

  const handleCancel = () => {
    setIsEditing(false);
    setSelectedValue('');
  };

  if (isEditing && canEdit) {
    return (
      <div className={cn('space-y-2', className)}>
        <label className="text-sm font-medium text-muted-foreground" htmlFor={`assignee-${workOrder.id}`}>
          Assignee
        </label>
        <Select
          value={selectedValue}
          onValueChange={setSelectedValue}
          disabled={isLoading || assignmentMutation.isPending}
        >
          <SelectTrigger id={`assignee-${workOrder.id}`} className="min-h-[44px] w-full touch-manipulation">
            <SelectValue placeholder={isLoading ? 'Loading assignees...' : 'Select assignee'} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="unassign">
              <span className="inline-flex items-center gap-2">
                <UserMinus className="h-4 w-4" aria-hidden />
                Unassigned
              </span>
            </SelectItem>
            {assignmentOptions.map((option) => (
              <SelectItem key={option.id} value={option.id}>
                {option.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {equipmentHasNoTeam ? (
          <p className="text-xs text-muted-foreground">Equipment has no team. Showing organization admins.</p>
        ) : null}
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            className="min-h-[44px] flex-1 touch-manipulation"
            onClick={() => void handleSave()}
            disabled={!selectedValue || assignmentMutation.isPending}
          >
            <Check className="h-4 w-4 mr-1" aria-hidden />
            {assignmentMutation.isPending ? 'Saving...' : 'Save'}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="min-h-[44px] touch-manipulation"
            onClick={handleCancel}
            disabled={assignmentMutation.isPending}
          >
            <X className="h-4 w-4" aria-hidden />
            <span className="sr-only">Cancel</span>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(mobileInlineEditRowClassName, className)}>
      <div className={cn('flex min-w-0 items-center gap-2 text-base', mobileInlineEditValueClassName)}>
        <User className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
        <span className="font-medium text-foreground">Assigned to</span>
        <span className="truncate text-muted-foreground">{displayName}</span>
      </div>
      {canEdit ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={inlineEditIconClassName}
          onClick={() => setIsEditing(true)}
          aria-label="Edit assignee"
        >
          <Edit2 className="h-4 w-4" aria-hidden />
        </Button>
      ) : null}
    </div>
  );
}
