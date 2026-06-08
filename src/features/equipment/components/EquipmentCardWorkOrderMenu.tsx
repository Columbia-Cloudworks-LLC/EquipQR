import React from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Plus, Wrench, ChevronDown } from 'lucide-react';
import { getPMComplianceLevel } from '@/features/equipment/hooks/useEquipmentPMStatus';
import type { EquipmentPMStatus } from '@/features/equipment/hooks/useEquipmentPMStatus';

interface EquipmentCardWorkOrderMenuProps {
  equipmentId: string;
  pmStatus?: EquipmentPMStatus;
  onQuickAction: (e: React.MouseEvent, path: string) => void;
  variant?: 'default' | 'icon';
}

export function EquipmentCardWorkOrderMenu({
  equipmentId,
  pmStatus,
  onQuickAction,
  variant = 'default',
}: EquipmentCardWorkOrderMenuProps) {
  const isPmOverdue = getPMComplianceLevel(pmStatus) === 'overdue';
  const pmWorkOrderPath = `/dashboard/equipment/${equipmentId}?createWorkOrder=pm`;
  const genericWorkOrderPath = `/dashboard/equipment/${equipmentId}?createWorkOrder=generic`;

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
      role="presentation"
    >
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          {variant === 'icon' ? (
            <Button
              variant={isPmOverdue ? 'destructive' : 'secondary'}
              size="icon"
              className="h-8 w-8 flex-shrink-0"
              aria-label="Work order quick actions"
            >
              <Plus className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              variant={isPmOverdue ? 'destructive' : 'secondary'}
              size="sm"
              className="h-8 gap-1.5 text-xs font-medium"
            >
              <Plus className="h-3.5 w-3.5" />
              Work Order
              <ChevronDown className="h-3.5 w-3.5 opacity-70" />
            </Button>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align={variant === 'icon' ? 'end' : 'start'} className="w-56">
          <DropdownMenuItem onClick={(e) => onQuickAction(e, pmWorkOrderPath)}>
            <Wrench className="mr-2 h-4 w-4" />
            New PM Work Order
          </DropdownMenuItem>
          <DropdownMenuItem onClick={(e) => onQuickAction(e, genericWorkOrderPath)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Generic Work Order
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
