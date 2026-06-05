import React from 'react';
import { SelectItem } from '@/components/ui/select';
import { Shield, User } from 'lucide-react';
import type { AssignmentOption } from '@/features/work-orders/hooks/useWorkOrderAssignment';

export type WorkOrderAssigneeSelectItemsProps = {
  options: AssignmentOption[];
};

export function WorkOrderAssigneeSelectItems({ options }: WorkOrderAssigneeSelectItemsProps) {
  return (
    <>
      {options.map((option) => (
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
                <span className="text-xs text-muted-foreground ml-1">({option.role})</span>
              )}
            </div>
          </div>
        </SelectItem>
      ))}
    </>
  );
}
