import React from 'react';
import { AlertTriangle, Clock, CheckCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { type EquipmentPMStatus, getPMComplianceLevel, type PMComplianceLevel } from '@/features/equipment/hooks/useEquipmentPMStatus';
import { cn } from '@/lib/utils';

interface PMStatusIndicatorProps {
  status: EquipmentPMStatus | undefined;
  size?: 'sm' | 'md';
  className?: string;
}

const INDICATOR_CONFIG: Record<PMComplianceLevel, {
  icon: typeof AlertTriangle;
  label: string;
  detail: (s: EquipmentPMStatus) => string;
  dotClass: string;
  iconClass: string;
}> = {
  overdue: {
    icon: AlertTriangle,
    label: 'PM Overdue',
    detail: (s) =>
      s.days_overdue != null
        ? `${s.days_overdue} days overdue`
        : s.hours_overdue != null
          ? `${Math.round(s.hours_overdue)} hrs overdue`
          : 'Overdue',
    dotClass: 'bg-destructive',
    iconClass: 'text-destructive',
  },
  due_soon: {
    icon: Clock,
    label: 'PM Due Soon',
    detail: (s) =>
      s.interval_type === 'days'
        ? `Due within ${s.interval_value} days`
        : `Due within ${s.interval_value} hrs`,
    dotClass: 'bg-warning',
    iconClass: 'text-warning',
  },
  current: {
    icon: CheckCircle,
    label: 'PM Current',
    detail: () => 'Within maintenance interval',
    dotClass: 'bg-success',
    iconClass: 'text-success',
  },
  no_interval: {
    icon: CheckCircle,
    label: '',
    detail: () => '',
    dotClass: '',
    iconClass: '',
  },
};

const PMStatusIndicator: React.FC<PMStatusIndicatorProps> = ({ status, size = 'sm', className }) => {
  if (!status) return null;

  const level = getPMComplianceLevel(status);
  if (level === 'no_interval') return null;

  const config = INDICATOR_CONFIG[level];
  const Icon = config.icon;

  if (size === 'sm') {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn('inline-block h-2.5 w-2.5 rounded-full flex-shrink-0', config.dotClass, className)}
            aria-label={config.label}
          />
        </TooltipTrigger>
        <TooltipContent>
          <p className="font-medium">{config.label}</p>
          <p className="text-xs">{config.detail(status)}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={cn('inline-flex items-center gap-1', className)}>
          <Icon className={cn('h-3.5 w-3.5', config.iconClass)} />
          <span className="text-xs font-medium">{config.label}</span>
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <p>{config.detail(status)}</p>
      </TooltipContent>
    </Tooltip>
  );
};

export default PMStatusIndicator;
