import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Separator } from '@/components/ui/separator';
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
  Shield,
  Clock,
  Wrench,
  MapPin,
  AlertCircle
} from 'lucide-react';
import { useUpdateWorkOrderStatus } from '@/features/work-orders/hooks/useWorkOrderData';
import { useWorkOrderAcceptance } from '@/features/work-orders/hooks/useWorkOrderAcceptance';
import { usePMByWorkOrderId } from '@/features/pm-templates/hooks/usePMData';
import { useWorkOrderPermissionLevels } from '@/features/work-orders/hooks/useWorkOrderPermissionLevels';
import { useWorkOrderContextualAssignment, type AssignmentWorkOrderContext } from '@/features/work-orders/hooks/useWorkOrderContextualAssignment';
import { useAuth } from '@/hooks/useAuth';

import WorkOrderAcceptanceModal from './WorkOrderAcceptanceModal';
import WorkOrderAssigneeDisplay from './WorkOrderAssigneeDisplay';
import ClickableAddress from '@/components/ui/ClickableAddress';
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
  /** Optional context data previously shown in QuickInfo */
  contextData?: {
    dueDate?: string;
    estimatedHours?: number;
    equipmentId?: string;
    equipmentName?: string;
    pmStatus?: string;
    formMode?: string;
    team?: {
      id: string;
      name: string;
      description?: string;
      location_address?: string | null;
      location_lat?: number | null;
      location_lng?: number | null;
    } | null;
  };
}

const WorkOrderStatusManager: React.FC<WorkOrderStatusManagerProps> = ({
  workOrder,
  organizationId,
  contextData
}) => {
  const [showAcceptanceModal, setShowAcceptanceModal] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
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
  const startAssigneeFieldId = `work-order-start-assignee-${workOrder.id}`;

  const handleStatusChange = async (newStatus: WorkOrderStatus) => {
    // Check if trying to complete work order with incomplete PM
    if (newStatus === 'completed' && workOrder.has_pm && pmData) {
      if (pmData.status !== 'completed') {
        return;
      }
    }

    if (newStatus === 'accepted') {
      setShowAcceptanceModal(true);
      return;
    }

    if (newStatus === 'cancelled') {
      setShowCancelDialog(true);
      return;
    }

    if (newStatus === 'completed') {
      setShowCompleteDialog(true);
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

  const handleConfirmCancel = async () => {
    try {
      await updateStatusMutation.mutateAsync({
        workOrderId: workOrder.id,
        status: 'cancelled',
        organizationId
      });
      setShowCancelDialog(false);
    } catch (error) {
      console.error('Error cancelling work order:', error);
    }
  };

  const handleConfirmComplete = async () => {
    try {
      await updateStatusMutation.mutateAsync({
        workOrderId: workOrder.id,
        status: 'completed',
        organizationId
      });
      setShowCompleteDialog(false);
    } catch (error) {
      console.error('Error completing work order:', error);
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
          variant: 'outline' as const,
          description: 'Cancel this work order'
        });
        return actions;
      }

      case 'accepted':
        if (!isManager && !isTechnician) return [];
        return [
          { 
            label: 'Cancel', 
            action: () => handleStatusChange('cancelled'), 
            icon: X,
            variant: 'outline' as const,
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
            variant: 'outline' as const,
            description: 'Cancel this work order'
          }
        ];

      default:
        return [];
    }
  };

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
            <Alert className="border-warning/30 bg-warning/10">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-warning">
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
                <Label htmlFor={startAssigneeFieldId} className="text-sm font-medium">Assign to start work</Label>
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
                  <SelectTrigger id={startAssigneeFieldId} className="w-full" aria-label="Select assignee to start work">
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
                  const isCancelAction = action.label === 'Cancel';
                  return (
                    <div key={index}>
                      <Button
                        variant={action.variant}
                        size="sm"
                        className={`w-full justify-start ${isCancelAction ? 'text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive' : ''}`}
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
            <div className="text-sm text-success">
              <CheckCircle className="h-4 w-4 inline mr-2" />
              Work order completed successfully
              {workOrder.completed_date && (
                <div className="text-xs text-muted-foreground mt-1">
                  Completed on {new Date(workOrder.completed_date).toLocaleDateString()}
                </div>
              )}
            </div>
          )}

          {/* Context Details (merged from QuickInfo) */}
          {contextData && (
            <>
              <Separator />
              <div className="space-y-3">
                {contextData.dueDate && (() => {
                  const due = new Date(contextData.dueDate);
                  const hoursUntilDue = (due.getTime() - Date.now()) / (1000 * 60 * 60);
                  const isOverdue = hoursUntilDue < 0;
                  const isDueSoon = !isOverdue && hoursUntilDue < 24;
                  return (
                    <div className={`flex items-center gap-2 text-sm ${isOverdue ? 'text-destructive' : isDueSoon ? 'text-warning' : ''}`}>
                      {isOverdue
                        ? <AlertCircle className="h-4 w-4" />
                        : <Clock className={`h-4 w-4 ${!isDueSoon ? 'text-muted-foreground' : ''}`} />
                      }
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-medium">
                          {contextData.formMode === 'requestor' && workOrder.status === 'submitted' ? 'Preferred Due:' : 'Due:'}
                        </span>
                        <span className={isOverdue || isDueSoon ? '' : 'text-muted-foreground'}>
                          {due.toLocaleDateString()}
                        </span>
                        {isOverdue && (
                          <Badge variant="outline" className="text-xs bg-destructive/10 text-destructive border-destructive/30">
                            OVERDUE
                          </Badge>
                        )}
                        {isDueSoon && (
                          <Badge variant="outline" className="text-xs bg-warning/10 text-warning border-warning/30">
                            DUE SOON
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {contextData.estimatedHours != null && (
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <span className="font-medium">Estimated:</span>
                      <span className="ml-1.5 text-muted-foreground">{contextData.estimatedHours}h</span>
                    </div>
                  </div>
                )}

                {contextData.pmStatus && (
                  <div className="flex items-center gap-2 text-sm">
                    <Clipboard className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <span className="font-medium">PM Status:</span>
                      <span className="ml-1.5 text-muted-foreground">
                        {contextData.pmStatus.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                  </div>
                )}

                {contextData.equipmentId && contextData.equipmentName && (
                  <div className="flex items-center gap-2 text-sm">
                    <Wrench className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <span className="font-medium">Equipment:</span>
                      <Link 
                        to={`/dashboard/equipment/${contextData.equipmentId}`}
                        className="ml-1.5 text-primary hover:underline"
                      >
                        {contextData.equipmentName}
                      </Link>
                    </div>
                  </div>
                )}

                {/* Team details */}
                {contextData.team && (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-sm">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <span className="font-medium">Team:</span>
                        <Link
                          to={`/dashboard/teams/${contextData.team.id}`}
                          className="ml-1.5 text-primary hover:underline"
                        >
                          {contextData.team.name}
                        </Link>
                      </div>
                    </div>
                    {contextData.team.description && (
                      <p className="text-xs text-muted-foreground pl-6 line-clamp-2">
                        {contextData.team.description}
                      </p>
                    )}
                    {contextData.team.location_address && (
                      <div className="flex items-center gap-2 text-sm pl-6">
                        <MapPin className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                        {contextData.team.location_lat != null && contextData.team.location_lng != null ? (
                          <ClickableAddress
                            address={contextData.team.location_address}
                            lat={contextData.team.location_lat}
                            lng={contextData.team.location_lng}
                            className="text-xs"
                            showIcon={false}
                          />
                        ) : (
                          <ClickableAddress
                            address={contextData.team.location_address}
                            className="text-xs"
                            showIcon={false}
                          />
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
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

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Cancel Work Order
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this work order? This action cannot be undone.
              Any logged hours, notes, and cost records will be preserved but the work order will be marked as cancelled.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={updateStatusMutation.isPending}>
              Go Back
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmCancel}
              disabled={updateStatusMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {updateStatusMutation.isPending ? 'Cancelling...' : 'Yes, Cancel Work Order'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Complete Confirmation Dialog */}
      <AlertDialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-success" />
              Complete Work Order
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>Are you sure you want to mark this work order as completed?</p>
                <p className="text-sm font-medium text-foreground">Before completing, please confirm:</p>
                <ul className="text-sm space-y-1 list-disc pl-4">
                  <li>All hours have been logged</li>
                  <li>All cost items have been recorded</li>
                  <li>Notes and photos are up to date</li>
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={updateStatusMutation.isPending}>
              Go Back
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmComplete}
              disabled={updateStatusMutation.isPending}
            >
              {updateStatusMutation.isPending ? 'Completing...' : 'Mark as Complete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default WorkOrderStatusManager;

