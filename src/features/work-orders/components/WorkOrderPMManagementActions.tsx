import React from 'react';
import { Button } from '@/components/ui/button';
import { Wrench } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WorkOrderPMManagementActionsProps {
  canManage: boolean;
  hasPm: boolean;
  onManage: () => void;
  className?: string;
}

export function WorkOrderPMManagementActions({
  canManage,
  hasPm,
  onManage,
  className,
}: WorkOrderPMManagementActionsProps) {
  if (!canManage) {
    return null;
  }

  return (
    <div className={cn('flex justify-end', className)}>
      <Button type="button" variant="outline" size="sm" onClick={onManage}>
        <Wrench className="h-4 w-4 mr-2" aria-hidden="true" />
        {hasPm ? 'Manage PM Template' : 'Add PM Checklist'}
      </Button>
    </div>
  );
}
