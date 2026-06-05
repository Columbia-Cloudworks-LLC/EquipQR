// fallow-ignore-file code-duplication
// Duplication rationale: Requestor status mirrors manager status controls

import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Clock, Wrench, Clipboard } from 'lucide-react';
import { WorkOrderData, EquipmentData, PermissionLevels, PMData } from '@/features/work-orders/types/workOrderDetails';
import { useFormatTimestamp } from '@/hooks/useFormatTimestamp';
import { formatStatus, getStatusColor } from '@/features/work-orders/utils/workOrderHelpers';
import { getWorkOrderAssignmentDisplay } from '@/features/work-orders/utils/workOrderAssignmentDisplay';

interface WorkOrderDetailsRequestorStatusProps {
  workOrder: WorkOrderData;
  permissionLevels: PermissionLevels;
  equipment?: EquipmentData | null;
  pmData?: PMData | null;
}

export const WorkOrderDetailsRequestorStatus: React.FC<WorkOrderDetailsRequestorStatusProps> = ({
  workOrder,
  permissionLevels,
  equipment,
  pmData
}) => {
  const { formatDate } = useFormatTimestamp();

  // Only show for non-managers
  if (permissionLevels.isManager) {
    return null;
  }

  const assignment = getWorkOrderAssignmentDisplay(workOrder);
  const AssignmentIcon = assignment.icon;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Work Order Status</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Status */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Current Status:</span>
          <Badge className={getStatusColor(workOrder.status)}>
            {formatStatus(workOrder.status)}
          </Badge>
        </div>

        {/* Assignment Information */}
        <div className="space-y-2">
          <span className="text-sm font-medium">{assignment.label}:</span>
          <div className="flex items-center gap-2">
            <AssignmentIcon className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">{assignment.name}</span>
          </div>
        </div>

        {/* Timing Information */}
        <div className="space-y-2 pt-2 border-t">
          {workOrder.due_date && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>Due {formatDate(workOrder.due_date)}</span>
            </div>
          )}

          {workOrder.completed_date && (
            <div className="flex items-center gap-2 text-sm text-success">
              <Clock className="h-4 w-4" />
              <span>Completed {formatDate(workOrder.completed_date)}</span>
            </div>
          )}
        </div>

        {/* Progress Information */}
        {workOrder.status === 'in_progress' && (
          <div className="text-sm text-info bg-info/10 p-2 rounded">
            Work is currently in progress
          </div>
        )}

        {workOrder.status === 'on_hold' && (
          <div className="text-sm text-warning bg-warning/10 p-2 rounded">
            Work is temporarily on hold
          </div>
        )}

        {/* Context Details (merged from QuickInfo) */}
        {(workOrder.estimated_hours != null || (workOrder.has_pm && pmData) || equipment) && (
          <>
            <Separator />
            <div className="space-y-2">
              {workOrder.estimated_hours != null && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>Estimated: {workOrder.estimated_hours}h</span>
                </div>
              )}

              {workOrder.has_pm && pmData && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clipboard className="h-4 w-4" />
                  <span>PM: {pmData.status.replace('_', ' ').toUpperCase()}</span>
                </div>
              )}

              {equipment && (
                <div className="flex items-center gap-2 text-sm">
                  <Wrench className="h-4 w-4 text-muted-foreground" />
                  <Link 
                    to={`/dashboard/equipment/${equipment.id}`}
                    className="text-primary hover:underline"
                  >
                    {equipment.name}
                  </Link>
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};



