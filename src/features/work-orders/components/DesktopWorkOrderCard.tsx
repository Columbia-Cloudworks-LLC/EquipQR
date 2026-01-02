import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, User, Users, UserX } from 'lucide-react';
import { useUnifiedPermissions } from '@/hooks/useUnifiedPermissions';
import type { WorkOrder, WorkOrderData } from '@/features/work-orders/types/workOrder';
import WorkOrderCostSubtotal from './WorkOrderCostSubtotal';
import PMProgressIndicator from './PMProgressIndicator';
import { WorkOrderQuickActions } from './WorkOrderQuickActions';
import { WorkOrderAssignmentHover } from './WorkOrderAssignmentHover';
import type { AssignmentWorkOrderContext } from '@/features/work-orders/hooks/useWorkOrderContextualAssignment';

interface DesktopWorkOrderCardProps {
  workOrder: WorkOrder;
  onNavigate: (id: string) => void;
  onAssignClick?: () => void;
  onReopenClick?: () => void;
}

const mapToWorkOrderData = (workOrder: WorkOrder): WorkOrderData => ({
  id: workOrder.id,
  title: workOrder.title,
  description: workOrder.description,
  equipmentId: workOrder.equipmentId ?? workOrder.equipment_id ?? '',
  organizationId: workOrder.organizationId ?? workOrder.organization_id ?? '',
  priority: workOrder.priority,
  status: workOrder.status,
  assigneeId: workOrder.assigneeId ?? workOrder.assignee_id,
  assigneeName: workOrder.assigneeName,
  teamId: workOrder.teamId ?? workOrder.team_id,
  teamName: workOrder.teamName ?? workOrder.equipmentTeamName,
  createdDate: workOrder.createdDate ?? workOrder.created_date ?? '',
  created_date: workOrder.created_date ?? workOrder.createdDate ?? '',
  dueDate: workOrder.dueDate ?? workOrder.due_date,
  estimatedHours: workOrder.estimatedHours ?? workOrder.estimated_hours,
  completedDate: workOrder.completedDate ?? workOrder.completed_date,
  equipmentName: workOrder.equipmentName,
  createdByName: workOrder.createdByName,
});

const DesktopWorkOrderCard: React.FC<DesktopWorkOrderCardProps> = ({ 
  workOrder, 
  onNavigate,
  onAssignClick,
  onReopenClick
}) => {
  const permissions = useUnifiedPermissions();
  const workOrderData = mapToWorkOrderData(workOrder);
  const detailedPermissions = permissions.workOrders.getDetailedPermissions(workOrderData);
  const equipmentTeamName = workOrder.equipmentTeamName ?? workOrder.teamName;
  const createdDateValue = workOrder.created_date ?? workOrder.createdDate;
  const dueDateValue = workOrder.due_date ?? workOrder.dueDate;
  const estimatedHoursValue = workOrder.estimated_hours ?? workOrder.estimatedHours;
  const completedDateValue = workOrder.completed_date ?? workOrder.completedDate;

  const assignmentContext: AssignmentWorkOrderContext = {
    ...workOrder,
    organization_id: workOrder.organization_id ?? workOrder.organizationId ?? '',
    equipment_id: workOrder.equipment_id ?? workOrder.equipmentId ?? '',
    equipmentTeamId: workOrder.equipmentTeamId ?? workOrder.team_id,
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'assigned':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'submitted':
      case 'accepted':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'on_hold':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatStatus = (status: string) => {
    return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{workOrder.title}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {workOrder.description}
            </p>
          </div>
          <div className="flex gap-2">
            <Badge className={getPriorityColor(workOrder.priority)}>
              {workOrder.priority} priority
            </Badge>
            <Badge className={getStatusColor(workOrder.status)}>
              {formatStatus(workOrder.status)}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="font-medium">Created</div>
              <div className="text-muted-foreground">
              {createdDateValue ? new Date(createdDateValue).toLocaleDateString() : '—'}
              </div>
            </div>
          </div>

          {dueDateValue && (
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="font-medium">Due Date</div>
                <div className="text-muted-foreground">
                  {new Date(dueDateValue).toLocaleDateString()}
                </div>
              </div>
            </div>
          )}

          {/* Equipment Team - Static Display */}
          {equipmentTeamName && (
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="font-medium">Equipment Team</div>
                <div className="text-muted-foreground">{equipmentTeamName}</div>
              </div>
            </div>
          )}

          {/* Assigned User - Interactive */}
          <WorkOrderAssignmentHover 
            workOrder={assignmentContext}
            disabled={!detailedPermissions.canEditAssignment}
          >
            <div className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 rounded p-1 -m-1 transition-colors">
              {workOrder.assigneeName ? (
                <>
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="font-medium">Assigned to</div>
                    <div className="text-muted-foreground">{workOrder.assigneeName}</div>
                  </div>
                </>
              ) : (
                <>
                  <UserX className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="font-medium">Assigned to</div>
                    <div className="text-muted-foreground">Unassigned</div>
                  </div>
                </>
              )}
            </div>
          </WorkOrderAssignmentHover>
        </div>

        {/* PM Progress Indicator */}
        {workOrder.has_pm && (
          <div className="mt-4 pt-4 border-t">
            <PMProgressIndicator 
              workOrderId={workOrder.id} 
              hasPM={workOrder.has_pm} 
            />
          </div>
        )}

        {/* Estimated Hours and Completion */}
        {estimatedHoursValue && (
          <div className={`mt-4 ${workOrder.has_pm ? '' : 'pt-4 border-t'}`}>
            <div className="text-sm">
              <span className="font-medium">Estimated time:</span> {estimatedHoursValue} hours
              {completedDateValue && (
                <span className="ml-4">
                  <span className="font-medium">Completed:</span> {new Date(completedDateValue).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Footer with Cost and Actions */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t">
          <div className="flex items-center gap-4">
            {/* Cost Display - Only for team managers and org admins */}
            {detailedPermissions.canEdit && (
              <WorkOrderCostSubtotal 
                workOrderId={workOrder.id}
                className="text-sm"
              />
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <WorkOrderQuickActions
              workOrderId={workOrder.id}
              workOrderStatus={workOrder.status}
              equipmentTeamId={workOrder.equipmentTeamId ?? workOrder.team_id}
            />
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => onNavigate(workOrder.id)}
            >
              View Details
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DesktopWorkOrderCard;

