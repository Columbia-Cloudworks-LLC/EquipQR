
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, User, UserMinus } from 'lucide-react';
import { WorkOrderData, PermissionLevels } from '@/features/work-orders/types/workOrderDetails';

interface WorkOrderDetailsRequestorStatusProps {
  workOrder: WorkOrderData;
  permissionLevels: PermissionLevels;
}

export const WorkOrderDetailsRequestorStatus: React.FC<WorkOrderDetailsRequestorStatusProps> = ({
  workOrder,
  permissionLevels
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'submitted': return 'bg-blue-100 text-blue-800';
      case 'accepted': return 'bg-purple-100 text-purple-800';
      case 'assigned': return 'bg-orange-100 text-orange-800';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800';
      case 'on_hold': return 'bg-gray-100 text-gray-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
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
            <div className="flex items-center gap-2 text-sm text-green-600">
              <Clock className="h-4 w-4" />
              <span>Completed {new Date(workOrder.completed_date).toLocaleDateString()}</span>
            </div>
          )}
        </div>

        {/* Progress Information */}
        {workOrder.status === 'in_progress' && (
          <div className="text-sm text-blue-600 bg-blue-50 p-2 rounded">
            Work is currently in progress
          </div>
        )}

        {workOrder.status === 'on_hold' && (
          <div className="text-sm text-yellow-600 bg-yellow-50 p-2 rounded">
            Work is temporarily on hold
          </div>
        )}
      </CardContent>
    </Card>
  );
};


