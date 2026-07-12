import React from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Plus, ChevronDown } from 'lucide-react';
import { getPMComplianceLevel } from '@/features/equipment/hooks/useEquipmentPMStatus';
import type { EquipmentPMStatus } from '@/features/equipment/hooks/useEquipmentPMStatus';

interface EquipmentCardWorkOrderMenuProps {
  equipmentId: string;
  pmStatus?: EquipmentPMStatus;
  onQuickAction?: (e: React.MouseEvent, path: string) => void;
  onCreateWorkOrder?: () => void;
  variant?: 'default' | 'icon' | 'mobile-bar';
}

export function EquipmentCardWorkOrderMenu({
  equipmentId,
  pmStatus,
  onQuickAction,
  onCreateWorkOrder,
  variant = 'default',
}: EquipmentCardWorkOrderMenuProps) {
  const isPmOverdue = getPMComplianceLevel(pmStatus) === 'overdue';
  const workOrderPath = `/dashboard/equipment/${equipmentId}?createWorkOrder=1`;

  const handleCreateWorkOrder = (e: React.MouseEvent) => {
    if (onCreateWorkOrder) {
      onCreateWorkOrder();
      return;
    }
    onQuickAction?.(e, workOrderPath);
  };

  const menuAlign = variant === 'icon' ? 'end' : 'start';

  return (
    <div
      className={variant === 'mobile-bar' ? 'flex-1 min-w-0' : undefined}
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
          ) : variant === 'mobile-bar' ? (
            <Button
              size="sm"
              variant={isPmOverdue ? 'destructive' : 'default'}
              className="w-full min-w-0 min-h-[44px] gap-1 px-2 xs:gap-1.5 xs:px-3"
              aria-label="Work order actions"
            >
              <Plus className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="truncate">Work Order</span>
              <ChevronDown className="h-4 w-4 shrink-0 opacity-70" aria-hidden="true" />
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
        <DropdownMenuContent align={menuAlign} className="w-56">
          <DropdownMenuItem onClick={handleCreateWorkOrder}>
            <Plus className="mr-2 h-4 w-4" />
            New Work Order
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
