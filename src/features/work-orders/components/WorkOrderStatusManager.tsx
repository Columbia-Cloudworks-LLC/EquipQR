import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { 
  CheckCircle, 
  Play, 
  Pause, 
  X, 
  User, 
  Users, 
  AlertTriangle,
  Clipboard,
  Shield
} from 'lucide-react';
import { useUpdateWorkOrderStatus } from '@/features/work-orders/hooks/useWorkOrderData';
import { useWorkOrderAcceptance } from '@/features/work-orders/hooks/useWorkOrderAcceptance';
import { usePMByWorkOrderId } from '@/features/pm-templates/hooks/usePMData';
import { useWorkOrderPermissionLevels } from '@/features/work-orders/hooks/useWorkOrderPermissionLevels';
import { useWorkOrderContextualAssignment, type AssignmentWorkOrderContext } from '@/features/work-orders/hooks/useWorkOrderContextualAssignment';
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
  // Required for contextual assignment
  organization_id?: string;
  equipment_id?: string;
  equipmentTeamId?: string | null;
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
  const [selectedAssigneeForStart, setSelectedAssigneeForStart] = useState<string>('');
  const updateStatusMutation = useUpdateWorkOrderStatus();
  const acceptanceMutation = useWorkOrderAcceptance();
  const { data: pmData } = usePMByWorkOrderId(workOrder.id);
  const { isManager, isTechnician } = useWorkOrderPermissionLevels();
  const { user } = useAuth();
  
  // Build context for contextual assignment - needed for accepted status
  const assignmentContext: AssignmentWorkOrderContext = {
    id: workOrder.id,
    organization_id: workOrder.organization_id || organizationId,
    equipment_id: workOrder.equipment_id,
    equipmentTeamId: workOrder.equipmentTeamId
  };
  const { assignmentOptions, isLoading: assignmentLoading, equipmentHasNoTeam } = useWorkOrderContextualAssignment(assignmentContext);

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

  const handleAcceptanceComplete = async (assigneeId?: string) => {
    try {
      // Use the acceptance mutation which properly handles assignee assignment
      await acceptanceMutation.mutateAsync({
        workOrderId: workOrder.id,
        organizationId,
        assigneeId
      });
      setShowAcceptanceModal(false);
    } catch (error) {
      console.error('Error accepting work order:', error);
    }
  };

  // Handler for assigning and starting work order from accepted status
  const handleAssignAndStart = async () => {
    if (!selectedAssigneeForStart) return;
    
    try {
      await updateStatusMutation.mutateAsync({
        workOrderId: workOrder.id,
        status: 'in_progress',
        organizationId,
        assigneeId: selectedAssigneeForStart
      });
      setSelectedAssigneeForStart(''); // Reset after successful update
    } catch (error) {
      console.error('Error assigning and starting work order:', error);
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
        // For accepted status, we render the assignment UI separately (dropdown + Start button)
        // Only return the Cancel action here
        if (!isManager && !isTechnician) return [];
        return [
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

          {/* Inline Assignment + Start for Accepted Status */}
          {workOrder.status === 'accepted' && (isManager || isTechnician) && (
            <div className="space-y-3 p-3 border rounded-lg bg-muted/30">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Assign to start work</Label>
                {equipmentHasNoTeam && (
                  <p className="text-xs text-muted-foreground">
                    Equipment has no team. Showing organization admins.
                  </p>
                )}
                <Select
                  value={selectedAssigneeForStart}
                  onValueChange={setSelectedAssigneeForStart}
                  disabled={assignmentLoading || updateStatusMutation.isPending}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={assignmentLoading ? "Loading..." : "Select assignee..."} />
                  </SelectTrigger>
                  <SelectContent>
                    {assignmentOptions.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        <div className="flex items-center gap-2">
                          {option.role === 'owner' || option.role === 'admin' ? (
                            <Shield className="h-4 w-4" />
                          ) : (
                            <User className="h-4 w-4" />
                          )}
                          <div>
                            <span>{option.name}</span>
                            {option.role && (
                              <span className="text-xs text-muted-foreground ml-1">
                                ({option.role})
                              </span>
                            )}
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                variant="secondary"
                size="sm"
                className="w-full"
                onClick={handleAssignAndStart}
                disabled={!selectedAssigneeForStart || updateStatusMutation.isPending}
              >
                <Play className="h-4 w-4 mr-2" />
                {updateStatusMutation.isPending ? 'Starting...' : 'Start Work'}
              </Button>
              <p className="text-xs text-muted-foreground">
                {selectedAssigneeForStart 
                  ? 'Click "Start Work" to assign and begin working on this order'
                  : 'Select an assignee to enable starting work'}
              </p>
            </div>
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
                        disabled={updateStatusMutation.isPending || acceptanceMutation.isPending || action.disabled}
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
