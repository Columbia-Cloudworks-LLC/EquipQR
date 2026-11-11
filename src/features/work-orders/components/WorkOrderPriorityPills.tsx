import React from 'react';
import { SegmentedPills, type SegmentedPillOption } from '@/components/ui/segmented-pills';
import type { WorkOrderPriority } from '@/features/work-orders/types/workOrder';

const PRIORITY_OPTIONS: ReadonlyArray<SegmentedPillOption<WorkOrderPriority>> = [
  { value: 'low', label: 'Low', tone: 'success' },
  { value: 'medium', label: 'Medium', tone: 'warning' },
  { value: 'high', label: 'High', tone: 'destructive' },
];

interface WorkOrderPriorityPillsProps {
  value: WorkOrderPriority | undefined;
  onChange: (priority: WorkOrderPriority) => void;
  id?: string;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/** Color-coded one-tap priority picker used wherever a work order's priority is set. */
export const WorkOrderPriorityPills: React.FC<WorkOrderPriorityPillsProps> = ({
  value,
  onChange,
  id,
  disabled,
  size = 'md',
  className,
}) => (
  <SegmentedPills
    id={id}
    ariaLabel="Priority"
    value={value}
    onValueChange={onChange}
    options={PRIORITY_OPTIONS}
    size={size}
    fullWidth
    disabled={disabled}
    className={className}
  />
);
