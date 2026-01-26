import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle, 
  Play, 
  Pause, 
  X, 
  User, 
  Users, 
  AlertTriangle,
  Clipboard
} from 'lucide-react';
import { useUpdateWorkOrderStatus } from '@/features/work-orders/hooks/useWorkOrderData';
import { usePMByWorkOrderId } from '@/features/pm-templates/hooks/usePMData';
import { useWorkOrderPermissionLevels } from '@/features/work-orders/hooks/useWorkOrderPermissionLevels';
import { useAuth } from '@/hooks/useAuth';

import WorkOrderAcceptanceModal from './WorkOrderAcceptanceModal';
import WorkOrderAssigneeDisplay from './WorkOrderAssigneeDisplay';
type WorkOrderStatus = 'submitted' | 'accepted' | 'assigned' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled';

type StatusWorkOrder = {
  id: string;
  status: WorkOrderStatus;
  has_pm?: boolean;
  assignee_id?: string | null;
  created_by?: string | null;
  assigneeName?: string | null;
  teamName?: string | null;
  acceptance_date?: string | null;
  completed_date?: string | null;
};

interface StatusAction {
  label: string;
  action: () => void;
  icon: React.ComponentType<{ className?: string }>;
  variant: 'default' | 'destructive' | 'outline' | 'secondary';
  description: string;
  disabled?: boolean;
}

interface WorkOrderStatusManagerProps {
  workOrder: StatusWorkOrder;
  organizationId: string;
}

const WorkOrderStatusManager: React.FC<WorkOrderStatusManagerProps> = ({
  workOrder,
  organizationId
}) => {
  const [showAcceptanceModal, setShowAcceptanceModal] = useState(false);
  const updateStatusMutation = useUpdateWorkOrderStatus();
  const { data: pmData } = usePMByWorkOrderId(workOrder.id);
  const { isManager, isTechnician } = useWorkOrderPermissionLevels();
  const { user } = useAuth();

  const handleStatusChange = async (newStatus: WorkOrderStatus) => {
    // Check if trying to complete work order with incomplete PM
    if (newStatus === 'completed' && workOrder.has_pm && pmData) {
      if (pmData.status !== 'completed') {
        // Don't allow completion if PM is not completed
        return;
      }
    }

    if (newStatus === 'accepted') {
      setShowAcceptanceModal(true);
      return;
    }

    try {
      await updateStatusMutation.mutateAsync({
        workOrderId: workOrder.id,
        status: newStatus,
        organizationId
      });
    } catch (error) {
      console.error('Error updating work order status:', error);
    }
  };

  const handleAcceptanceComplete = async () => {
    try {
      await updateStatusMutation.mutateAsync({
        workOrderId: workOrder.id,
        status: 'accepted',
        organizationId
      });
      setShowAcceptanceModal(false);
    } catch (error) {
      console.error('Error accepting work order:', error);
    }
  };

  // Check if user can perform status actions
  const canPerformStatusActions = () => {
    if (isManager) return true;
    if (isTechnician && (workOrder.assignee_id === user?.id)) return true;
    if (workOrder.created_by === user?.id && workOrder.status === 'submitted') return true;
    return false;
  };

const getStatusActions = (): StatusAction[] => {
    if (!canPerformStatusActions()) return [];

    const canComplete = !workOrder.has_pm || (pmData && pmData.status === 'completed');
    
    switch (workOrder.status) {
      case 'submitted': {
        const actions: StatusAction[] = [];
        if (isManager || isTechnician) {
          actions.push({ 
            label: 'Accept', 
            action: () => handleStatusChange('accepted'), 
            icon: CheckCircle,
            variant: 'secondary' as const,
            description: 'Accept this work order and proceed with planning'
          });
        }
        actions.push({ 
          label: 'Cancel', 
          action: () => handleStatusChange('cancelled'), 
          icon: X,
          variant: 'destructive' as const,
          description: 'Cancel this work order'
        });
        return actions;
      }

      case 'accepted':
        if (!isManager && !isTechnician) return [];
        return [
          { 
            label: 'Assign & Start', 
            action: () => handleStatusChange('in_progress'), 
            icon: Play,
            variant: 'secondary' as const,
            description: 'Assign to team member and start work'
          },
          { 
            label: 'Cancel', 
            action: () => handleStatusChange('cancelled'), 
            icon: X,
            variant: 'destructive' as const,
            description: 'Cancel this work order'
          }
        ];

      case 'assigned':
        if (!isManager && !isTechnician) return [];
        return [
          { 
            label: 'Start Work', 
            action: () => handleStatusChange('in_progress'), 
            icon: Play,
            variant: 'secondary' as const,
            description: 'Begin working on this order'
          },
          { 
            label: 'Put on Hold', 
            action: () => handleStatusChange('on_hold'), 
            icon: Pause,
            variant: 'outline' as const,
            description: 'Temporarily pause this work order'
          }
        ];

      case 'in_progress':
        if (!isManager && !isTechnician) return [];
        return [
          { 
            label: 'Complete', 
            action: () => handleStatusChange('completed'), 
            icon: CheckCircle,
            variant: 'default' as const,
            description: canComplete ? 'Mark this work order as completed' : 'Complete PM checklist first',
            disabled: !canComplete
          },
          { 
            label: 'Put on Hold', 
            action: () => handleStatusChange('on_hold'), 
            icon: Pause,
            variant: 'outline' as const,
            description: 'Temporarily pause this work order'
          }
        ];

      case 'on_hold':
        if (!isManager && !isTechnician) return [];
        return [
          { 
            label: 'Resume', 
            action: () => handleStatusChange('in_progress'), 
            icon: Play,
            variant: 'secondary' as const,
            description: 'Resume work on this order'
          },
          { 
            label: 'Cancel', 
            action: () => handleStatusChange('cancelled'), 
            icon: X,
            variant: 'destructive' as const,
            description: 'Cancel this work order'
          }
        ];

      default:
        return [];
    }
  };

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

  const statusActions = getStatusActions();

  return (
    <div className="space-y-4">
      {/* Assignment Display */}
      <WorkOrderAssigneeDisplay
        workOrder={workOrder}
        organizationId={organizationId}
        canManageAssignment={isManager}
        showEditControls={workOrder.status !== 'completed' && workOrder.status !== 'cancelled'}
      />

      {/* Status Management */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Status Management</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Current Status:</span>
            <Badge className={getStatusColor(workOrder.status)}>
              {formatStatus(workOrder.status)}
            </Badge>
          </div>

          {/* PM Status Check Warning */}
          {workOrder.has_pm && workOrder.status === 'in_progress' && pmData && pmData.status !== 'completed' && (
            <Alert className="border-amber-200 bg-amber-50">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-amber-800">
                <div className="flex items-center gap-2">
                  <Clipboard className="h-4 w-4" />
                  <span>Complete the PM checklist before marking this work order as completed.</span>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Assignment Info */}
          {workOrder.assigneeName && (
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-muted-foreground" />
              <span>Assigned to: {workOrder.assigneeName}</span>
            </div>
          )}

          {workOrder.teamName && (
            <div className="flex items-center gap-2 text-sm">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span>Team: {workOrder.teamName}</span>
            </div>
          )}

          {/* Permission Info */}
          {!canPerformStatusActions() && (
            <Alert>
              <AlertDescription>
                You don't have permission to change the status of this work order.
              </AlertDescription>
            </Alert>
          )}

          {/* Status Actions */}
          {statusActions.length > 0 && (
            <div className="space-y-2">
              <span className="text-sm font-medium">Available Actions:</span>
              <div className="space-y-2">
                {statusActions.map((action, index) => {
                  const IconComponent = action.icon;
                  return (
                    <div key={index}>
                      <Button
                        variant={action.variant}
                        size="sm"
                        className="w-full justify-start"
                        onClick={action.action}
                        disabled={updateStatusMutation.isPending || action.disabled}
                      >
                        <IconComponent className="h-4 w-4 mr-2" />
                        {action.label}
                      </Button>
                      <p className="text-xs text-muted-foreground ml-6 mt-1">
                        {action.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {workOrder.status === 'completed' && (
            <div className="text-sm text-green-600">
              <CheckCircle className="h-4 w-4 inline mr-2" />
              Work order completed successfully
              {workOrder.completed_date && (
                <div className="text-xs text-muted-foreground mt-1">
                  Completed on {new Date(workOrder.completed_date).toLocaleDateString()}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <WorkOrderAcceptanceModal
        open={showAcceptanceModal}
        onClose={() => setShowAcceptanceModal(false)}
        workOrder={workOrder}
        organizationId={organizationId}
        onAccept={handleAcceptanceComplete}
      />
    </div>
  );
};

export default WorkOrderStatusManager;
