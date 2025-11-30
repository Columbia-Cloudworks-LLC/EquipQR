import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, User, Clock, Users, UserX } from 'lucide-react';
import { Link } from 'react-router-dom';
import WorkOrderCostSubtotal from './WorkOrderCostSubtotal';
import type { WorkOrder } from '@/types/workOrder';
import { WorkOrderQuickActions } from './WorkOrderQuickActions';
import { useUnifiedPermissions } from '@/hooks/useUnifiedPermissions';
import { useWorkOrderStatusUpdate } from '@/hooks/useWorkOrderStatusUpdate';
import { useQuickWorkOrderAssignment } from '@/hooks/useQuickWorkOrderAssignment';
import { useWorkOrderContextualAssignment } from '@/hooks/useWorkOrderContextualAssignment';
import { ensureWorkOrderData } from '@/utils/workOrderTypeConversion';
import type { Database } from '@/integrations/supabase/types';
import { logger } from '@/utils/logger';
import { Loader2 } from 'lucide-react';

interface MobileWorkOrderCardProps {
  order: WorkOrder;
  onAcceptClick: (order: WorkOrder) => void;
  onStatusUpdate: (workOrderId: string, newStatus: string) => void;
  isUpdating: boolean;
  isAccepting: boolean;
  onAssignClick?: () => void;
  onReopenClick?: () => void;
}

const MobileWorkOrderCard: React.FC<MobileWorkOrderCardProps> = ({
  order,
  onAcceptClick,
  onStatusUpdate,
  isUpdating,
  isAccepting,
  onAssignClick,
  onReopenClick
}) => {
  const permissions = useUnifiedPermissions();
  const statusUpdateMutation = useWorkOrderStatusUpdate();
  const assignmentMutation = useQuickWorkOrderAssignment();
  const { assignmentOptions, isLoading: isLoadingAssignees } = useWorkOrderContextualAssignment(order);

  // Check if user can change status
  const workOrderPermissions = permissions.workOrders.getDetailedPermissions(ensureWorkOrderData(order));
  const canChangeStatus = workOrderPermissions.canChangeStatus;

  const handleStatusUpdate = (newStatus: Database["public"]["Enums"]["work_order_status"]) => {
    statusUpdateMutation.mutate({
      workOrderId: order.id,
      newStatus
    }, {
      onSuccess: () => {
        // Notify parent component of status change
        onStatusUpdate(order.id, newStatus);
      }
    });
  };

  const handleAssignmentChange = async (assigneeId: string | null) => {
    try {
      await assignmentMutation.mutateAsync({
        workOrderId: order.id,
        assigneeId,
        organizationId: order.organizationId
      });
    } catch {
      // Error is handled in the mutation
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'submitted':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'accepted':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'assigned':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'on_hold':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
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

  const formatStatusText = (status: string) => {
    return status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return 'Invalid Date';
    }
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="space-y-3">
          {/* Title and Equipment */}
          <div>
            <CardTitle className="text-base leading-tight">{order.title}</CardTitle>
            {order.equipmentName && (
              <p className="text-sm text-muted-foreground mt-1">
                Equipment: {order.equipmentName}
              </p>
            )}
          </div>

          {/* Priority Badge */}
          <div className="flex gap-2 flex-wrap">
            <Badge className={getPriorityColor(order.priority)} variant="outline">
              {order.priority}
            </Badge>
          </div>

          {/* Description */}
          <CardDescription className="text-sm line-clamp-2">
            {order.description}
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="space-y-4">
          {/* Key Information - Stacked vertically */}
          <div className="space-y-2 text-sm">
            {/* Status - Editable Field */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">Status:</span>
              {canChangeStatus ? (
                <Select
                  value={order.status}
                  onValueChange={(value) => handleStatusUpdate(value as Database["public"]["Enums"]["work_order_status"])}
                  disabled={statusUpdateMutation.isPending}
                >
                  <SelectTrigger className={`h-8 w-full max-w-[180px] ${getStatusColor(order.status)} border`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="submitted">{formatStatusText('submitted')}</SelectItem>
                    <SelectItem value="accepted">{formatStatusText('accepted')}</SelectItem>
                    <SelectItem value="assigned">{formatStatusText('assigned')}</SelectItem>
                    <SelectItem value="in_progress">{formatStatusText('in_progress')}</SelectItem>
                    <SelectItem value="on_hold">{formatStatusText('on_hold')}</SelectItem>
                    <SelectItem value="completed">{formatStatusText('completed')}</SelectItem>
                    <SelectItem value="cancelled">{formatStatusText('cancelled')}</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <Badge className={getStatusColor(order.status)} variant="outline">
                  {formatStatusText(order.status)}
                </Badge>
              )}
            </div>

            {/* Equipment Team - Static Display */}
            {order.equipmentTeamName && (
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-muted-foreground">Team: {order.equipmentTeamName}</span>
              </div>
            )}

            {/* Assigned User - Interactive */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">Assigned:</span>
              <Select
                value={order.assignedTo?.id || 'unassigned'}
                onValueChange={(value) => handleAssignmentChange(value === 'unassigned' ? null : value)}
                disabled={isUpdating || isLoadingAssignees || assignmentMutation.isPending}
              >
                <SelectTrigger className="w-full">
                  <div className="flex items-center gap-2">
                    {order.assignedTo?.name ? (
                      <span className="truncate text-left">{order.assignedTo.name}</span>
                    ) : (
                      <span className="text-muted-foreground">Unassigned</span>
                    )}
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">
                    <div className="flex items-center gap-2">
                      <UserX className="h-3 w-3" />
                      <span>Unassigned</span>
                    </div>
                  </SelectItem>
                  {assignmentOptions.map((assignee) => (
                    <SelectItem key={assignee.id} value={assignee.id}>
                      <div className="flex items-center gap-2">
                        <User className="h-3 w-3" />
                        <span>{assignee.name}</span>
                        {assignee.role && (
                          <span className="text-xs text-muted-foreground">({assignee.role})</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date Info */}
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="text-muted-foreground">
                Created: {formatDate(order.createdDate)}
                {order.dueDate && ` • Due: ${formatDate(order.dueDate)}`}
              </span>
            </div>

            {/* Time and Cost Info */}
            <div className="flex items-center justify-between">
              {order.estimatedHours && (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{order.estimatedHours}h est.</span>
                </div>
              )}
              <WorkOrderCostSubtotal 
                workOrderId={order.id}
                className="flex-shrink-0"
              />
            </div>

            {/* Completion Date */}
            {order.completedDate && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-muted-foreground text-xs">
                  Completed: {formatDate(order.completedDate)}
                </span>
              </div>
            )}
          </div>

          {/* Action Buttons - Full width and stacked */}
          <div className="space-y-2 pt-2 border-t">
            <div className="flex gap-2">
              <Button variant="outline" size="sm" asChild className="flex-1 justify-center">
                <Link to={`/dashboard/work-orders/${order.id}`}>
                  View Details
                </Link>
              </Button>
              {order.status === 'submitted' && (
                <Button
                  size="sm"
                  className="flex-1 justify-center"
                  onClick={() => onAcceptClick(order)}
                  disabled={isAccepting}
                >
                  {isAccepting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Accepting...
                    </>
                  ) : (
                    'Accept'
                  )}
                </Button>
              )}
              <WorkOrderQuickActions
                workOrder={order}
                onAssignClick={onAssignClick}
                onReopenClick={onReopenClick}
                onStatusUpdate={onStatusUpdate}
                onDeleteSuccess={() => {
                  // Handle delete success if needed
                  logger.info('Work order deleted');
                }}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default MobileWorkOrderCard;
