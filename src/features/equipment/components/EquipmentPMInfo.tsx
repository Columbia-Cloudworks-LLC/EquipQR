import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, Clock, AlertTriangle, Calendar, Timer } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { getLatestCompletedPM } from '@/features/pm-templates/services/preventativeMaintenanceService';
import { useEquipmentPMStatus, getPMComplianceLevel } from '@/features/equipment/hooks/useEquipmentPMStatus';
import { PM_INTERVALS_ENABLED } from '@/lib/flags';

interface EquipmentPMInfoProps {
  equipmentId: string;
  organizationId: string;
  onViewPM?: (pmId: string) => void;
}

const COMPLIANCE_CONFIG = {
  current: {
    icon: CheckCircle,
    label: 'PM Current',
    badgeClass: 'bg-success/20 text-success',
    iconClass: 'text-success',
  },
  due_soon: {
    icon: Clock,
    label: 'PM Due Soon',
    badgeClass: 'bg-warning/20 text-warning',
    iconClass: 'text-warning',
  },
  overdue: {
    icon: AlertTriangle,
    label: 'PM Overdue',
    badgeClass: 'bg-destructive/20 text-destructive',
    iconClass: 'text-destructive',
  },
  no_interval: {
    icon: CheckCircle,
    label: 'Completed',
    badgeClass: 'bg-success/20 text-success',
    iconClass: 'text-success',
  },
} as const;

const EquipmentPMInfo: React.FC<EquipmentPMInfoProps> = ({
  equipmentId,
  organizationId,
  onViewPM
}) => {
  const { data: latestPM, isLoading: isPMLoading } = useQuery({
    queryKey: ['latestPM', organizationId, equipmentId],
    queryFn: () => getLatestCompletedPM(equipmentId),
    enabled: !!equipmentId && !!organizationId,
  });

  const { data: pmStatus } = useEquipmentPMStatus(equipmentId);
  const compliance = getPMComplianceLevel(pmStatus);
  const config = COMPLIANCE_CONFIG[compliance];
  const StatusIcon = config.icon;

  if (isPMLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Preventative Maintenance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-16 bg-muted animate-pulse rounded" />
        </CardContent>
      </Card>
    );
  }

  if (!latestPM) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            Preventative Maintenance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No PM records found. Create a work order with PM to start tracking.
          </p>
        </CardContent>
      </Card>
    );
  }

  const daysSinceLastPM = Math.floor(
    (Date.now() - new Date(latestPM.completed_at).getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <StatusIcon className={`h-4 w-4 ${config.iconClass}`} />
          Preventative Maintenance
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-medium">Last PM</span>
            </div>
            <p className="text-sm">
              {new Date(latestPM.completed_at).toLocaleDateString()}
            </p>
            <p className="text-xs text-muted-foreground">{daysSinceLastPM} days ago</p>
          </div>

          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-medium">Work Order</span>
            </div>
            <p className="text-sm truncate">{latestPM.work_order_title}</p>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          <Badge className={config.badgeClass}>{config.label}</Badge>

          {PM_INTERVALS_ENABLED && pmStatus && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Timer className="h-3 w-3" />
              Every {pmStatus.interval_value} {pmStatus.interval_type === 'hours' ? 'hrs' : 'days'}
              {pmStatus.source === 'equipment_default' && ' (default)'}
            </span>
          )}

          {PM_INTERVALS_ENABLED && pmStatus?.is_overdue && pmStatus.days_overdue != null && (
            <span className="text-xs text-destructive font-medium">
              {pmStatus.days_overdue} days overdue
            </span>
          )}

          {PM_INTERVALS_ENABLED && pmStatus?.is_overdue && pmStatus.hours_overdue != null && (
            <span className="text-xs text-destructive font-medium">
              {Math.round(pmStatus.hours_overdue)} hrs overdue
            </span>
          )}
        </div>

        {onViewPM && (
          <div className="pt-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onViewPM(latestPM.id)}
            >
              View PM Details
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default EquipmentPMInfo;
