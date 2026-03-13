
import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Clock, User, UserMinus, Wrench, Clipboard } from 'lucide-react';
import { WorkOrderData, EquipmentData, PermissionLevels, PMData } from '@/features/work-orders/types/workOrderDetails';

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
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'submitted': return 'bg-info/20 text-info';
      case 'accepted': return 'bg-primary/20 text-primary';
      case 'assigned': return 'bg-warning/20 text-warning';
      case 'in_progress': return 'bg-warning/20 text-warning';
      case 'on_hold': return 'bg-muted text-foreground';
      case 'completed': return 'bg-success/20 text-success';
      case 'cancelled': return 'bg-destructive/20 text-destructive';
      default: return 'bg-muted text-foreground';
    }
  };

  const formatStatus = (status: string) => {
    return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getAssignmentInfo = () => {
    const assigneeName = workOrder.assigneeName || workOrder.assignee?.name;
    
    if (workOrder.assignee_id && assigneeName) {
      return {
        type: 'user',
        name: assigneeName,
        icon: User,
        label: 'Assigned to'
      };
    }
    
    return {
      type: 'unassigned',
      name: 'Not yet assigned',
      icon: UserMinus,
      label: 'Assignment'
    };
  };

  // Only show for non-managers
  if (permissionLevels.isManager) {
    return null;
  }

  const assignment = getAssignmentInfo();
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
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>Created {new Date(workOrder.created_date).toLocaleDateString()}</span>
          </div>

          {workOrder.due_date && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>Due {new Date(workOrder.due_date).toLocaleDateString()}</span>
            </div>
          )}

          {workOrder.completed_date && (
            <div className="flex items-center gap-2 text-sm text-success">
              <Clock className="h-4 w-4" />
              <span>Completed {new Date(workOrder.completed_date).toLocaleDateString()}</span>
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



