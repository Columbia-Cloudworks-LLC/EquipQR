
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useUnifiedPermissions } from '@/hooks/useUnifiedPermissions';
import { useAsyncOperation } from '@/hooks/useAsyncOperation';
import { useWorkOrderAcceptance } from '@/hooks/useWorkOrderAcceptance';
import { Play, Pause, CheckCircle, XCircle, Settings, AlertTriangle, UserCheck } from 'lucide-react';
import { WorkOrder } from '@/services/supabaseDataService';
import { WorkOrderService } from '@/services/WorkOrderService';
import { ensureWorkOrderData } from '@/utils/workOrderTypeConversion';
import WorkOrderAcceptanceModal from './WorkOrderAcceptanceModal';

interface WorkOrderStatusManagerProps {
  workOrder: WorkOrder;
  onStatusUpdate?: (newStatus: WorkOrder['status']) => void;
}

const WorkOrderStatusManager: React.FC<WorkOrderStatusManagerProps> = ({ 
  workOrder, 
  onStatusUpdate 
}) => {
  const { toast } = useToast();
  const { currentOrganization } = useOrganization();
  const permissions = useUnifiedPermissions();
  const acceptanceMutation = useWorkOrderAcceptance();
  const [showAcceptanceModal, setShowAcceptanceModal] = useState(false);

  const workOrderService = currentOrganization 
    ? new WorkOrderService(currentOrganization.id) 
    : null;

  const { execute: updateStatus, isLoading } = useAsyncOperation(
    async (newStatus: WorkOrder['status']) => {
      if (!workOrderService) throw new Error('Service not available');
      const result = await workOrderService.updateStatus(workOrder.id, newStatus);
      return { result, newStatus };
    },
    {
      onSuccess: (data) => {
        if (data?.result?.success) {
          toast({
            title: "Status Updated",
            description: `Work order status changed successfully`,
          });
          if (onStatusUpdate) {
            onStatusUpdate(data.newStatus);
          }
        }
      },
      onError: (error) => {
        toast({
          title: "Error",
          description: error || "Failed to update work order status",
          variant: "destructive",
        });
      }
    }
  );

  const workOrderPermissions = permissions.workOrders.getPermissions(ensureWorkOrderData(workOrder));

  const getNextStatusOptions = (currentStatus: WorkOrder['status']) => {
    switch (currentStatus) {
      case 'submitted':
        return [
          { 
            value: 'accept', 
            label: 'Accept Work Order', 
            icon: UserCheck,
            isCustomAction: true,
            description: 'Accept and optionally assign this work order'
          },
          { value: 'cancelled', label: 'Cancel', icon: XCircle }
        ];
      case 'accepted':
        return [
          { value: 'assigned', label: 'Assign', icon: Settings },
          { value: 'cancelled', label: 'Cancel', icon: XCircle }
        ];
      case 'assigned':
        return [
          { value: 'in_progress', label: 'Start Work', icon: Play },
          { value: 'on_hold', label: 'Put on Hold', icon: Pause },
          { value: 'cancelled', label: 'Cancel', icon: XCircle }
        ];
      case 'in_progress':
        return [
          { value: 'completed', label: 'Complete', icon: CheckCircle },
          { value: 'on_hold', label: 'Put on Hold', icon: Pause },
          { value: 'cancelled', label: 'Cancel', icon: XCircle }
        ];
      case 'on_hold':
        return [
          { value: 'in_progress', label: 'Resume Work', icon: Play },
          { value: 'cancelled', label: 'Cancel', icon: XCircle }
        ];
      default:
        return [];
    }
  };

  const handleStatusUpdate = async (newStatus: WorkOrder['status']) => {
    await updateStatus(newStatus);
  };

  const handleAcceptance = async (assigneeId?: string) => {
    if (!currentOrganization) return;
    
    await acceptanceMutation.mutateAsync({
      workOrderId: workOrder.id,
      organizationId: currentOrganization.id,
      assigneeId
    });

    if (onStatusUpdate) {
      // Determine the new status based on assignment
      const newStatus = assigneeId ? 'assigned' : 'accepted';
      onStatusUpdate(newStatus);
    }
  };

  const handleActionClick = (action: { value: string; isCustomAction?: boolean }) => {
    if (action.isCustomAction && action.value === 'accept') {
      setShowAcceptanceModal(true);
    } else {
      handleStatusUpdate(action.value as WorkOrder['status']);
    }
  };

  const nextStatusOptions = getNextStatusOptions(workOrder.status);

  const getStatusColor = (status: string) => {
    const statusColors = {
      'submitted': 'bg-blue-100 text-blue-800 border-blue-200',
      'accepted': 'bg-purple-100 text-purple-800 border-purple-200',
      'assigned': 'bg-orange-100 text-orange-800 border-orange-200',
      'in_progress': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'on_hold': 'bg-gray-100 text-gray-800 border-gray-200',
      'completed': 'bg-green-100 text-green-800 border-green-200',
      'cancelled': 'bg-red-100 text-red-800 border-red-200'
    };
    return statusColors[status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const formatStatus = (status: string) => {
    return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  if (!permissions.context) {
    return (
      <Card>
        <CardContent className="p-6">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Unable to load permissions. Please refresh the page.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Status Management</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground">Current Status</label>
            <div className="mt-1">
              <Badge className={getStatusColor(workOrder.status)}>
                {formatStatus(workOrder.status)}
              </Badge>
            </div>
          </div>

          {workOrderPermissions.canChangeStatus && nextStatusOptions.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                Available Actions
              </label>
              <div className="space-y-2">
                {nextStatusOptions.map((option) => {
                  const Icon = option.icon;
                  return (
                    <Button
                      key={option.value}
                      variant="outline"
                      size="sm"
                      className="w-full justify-start"
                      onClick={() => handleActionClick(option)}
                      disabled={isLoading || acceptanceMutation.isPending}
                    >
                      <Icon className="h-4 w-4 mr-2" />
                      {option.label}
                    </Button>
                  );
                })}
              </div>
            </div>
          )}

          {!workOrderPermissions.canChangeStatus && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                You don't have permission to change the status of this work order. 
                Only organization admins and team members can update work order status.
              </AlertDescription>
            </Alert>
          )}

          {nextStatusOptions.length === 0 && workOrderPermissions.canChangeStatus && (
            <p className="text-sm text-muted-foreground">
              No status changes available for {formatStatus(workOrder.status)} work orders.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Acceptance Modal */}
      {currentOrganization && (
        <WorkOrderAcceptanceModal
          open={showAcceptanceModal}
          onClose={() => setShowAcceptanceModal(false)}
          workOrder={ensureWorkOrderData(workOrder)}
          organizationId={currentOrganization.id}
          onAccept={handleAcceptance}
        />
      )}
    </>
  );
};

export default WorkOrderStatusManager;
