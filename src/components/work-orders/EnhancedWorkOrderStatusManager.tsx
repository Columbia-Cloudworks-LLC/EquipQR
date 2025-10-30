
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle, Clock, AlertTriangle, Play, Pause, XCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useUpdateWorkOrderStatus } from '@/hooks/useWorkOrderData';
import { getPMByWorkOrderId } from '@/services/preventativeMaintenanceService';
import { WorkOrder } from '@/services/supabaseDataService';
import { toast } from 'sonner';

interface EnhancedWorkOrderStatusManagerProps {
  workOrder: WorkOrder;
  organizationId: string;
  canUpdate?: boolean;
}

const EnhancedWorkOrderStatusManager: React.FC<EnhancedWorkOrderStatusManagerProps> = ({
  workOrder,
  organizationId,
  canUpdate = true
}) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const updateStatusMutation = useUpdateWorkOrderStatus();

  // Check if this work order has a PM requirement
  const { data: pmRecord, isLoading: pmLoading } = useQuery({
    queryKey: ['pmByWorkOrder', workOrder.id, organizationId],
    queryFn: () => getPMByWorkOrderId(workOrder.id, organizationId),
    enabled: (workOrder.has_pm || workOrder.pm_required) && !!organizationId,
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'submitted':
        return <Clock className="h-4 w-4 text-blue-600" />;
      case 'accepted':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'assigned':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'in_progress':
        return <Play className="h-4 w-4 text-blue-600" />;
      case 'on_hold':
        return <Pause className="h-4 w-4 text-orange-600" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'submitted':
        return 'bg-blue-100 text-blue-800';
      case 'accepted':
        return 'bg-green-100 text-green-800';
      case 'assigned':
        return 'bg-yellow-100 text-yellow-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'on_hold':
        return 'bg-orange-100 text-orange-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatStatus = (status: string) => {
    return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getAvailableTransitions = () => {
    const transitions: { status: string; label: string; disabled?: boolean; reason?: string }[] = [];

    switch (workOrder.status) {
      case 'submitted':
        transitions.push({ status: 'accepted', label: 'Accept' });
        transitions.push({ status: 'cancelled', label: 'Cancel' });
        break;
      case 'accepted':
        transitions.push({ status: 'assigned', label: 'Assign' });
        transitions.push({ status: 'in_progress', label: 'Start Work' });
        transitions.push({ status: 'cancelled', label: 'Cancel' });
        break;
      case 'assigned':
        transitions.push({ status: 'in_progress', label: 'Start Work' });
        transitions.push({ status: 'on_hold', label: 'Put On Hold' });
        transitions.push({ status: 'cancelled', label: 'Cancel' });
        break;
      case 'in_progress':
        // Check if PM is required and completed
        if (workOrder.has_pm || workOrder.pm_required) {
          const pmCompleted = pmRecord?.status === 'completed';
          transitions.push({ 
            status: 'completed', 
            label: 'Complete',
            disabled: !pmCompleted,
            reason: pmCompleted ? undefined : 'PM must be completed first'
          });
        } else {
          transitions.push({ status: 'completed', label: 'Complete' });
        }
        transitions.push({ status: 'on_hold', label: 'Put On Hold' });
        transitions.push({ status: 'cancelled', label: 'Cancel' });
        break;
      case 'on_hold':
        transitions.push({ status: 'in_progress', label: 'Resume Work' });
        transitions.push({ status: 'cancelled', label: 'Cancel' });
        break;
    }

    return transitions;
  };

  const handleStatusUpdate = async (newStatus: string) => {
    // Additional validation for completion
    if (newStatus === 'completed' && (workOrder.has_pm || workOrder.pm_required)) {
      if (!pmRecord || pmRecord.status !== 'completed') {
        toast.error('Cannot complete work order: Preventative maintenance must be completed first');
        return;
      }
    }

    setIsUpdating(true);
    try {
      await updateStatusMutation.mutateAsync({
        workOrderId: workOrder.id,
        status: newStatus,
        organizationId
      });
      toast.success(`Work order ${formatStatus(newStatus).toLowerCase()}`);
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update work order status');
    } finally {
      setIsUpdating(false);
    }
  };

  const availableTransitions = getAvailableTransitions();

  return (
    <div className="space-y-4">
      {/* Current Status */}
      <div className="flex items-center gap-3">
        {getStatusIcon(workOrder.status)}
        <div>
          <Badge className={getStatusColor(workOrder.status)}>
            {formatStatus(workOrder.status)}
          </Badge>
        </div>
      </div>

      {/* PM Status Alert */}
      {(workOrder.has_pm || workOrder.pm_required) && (
        <Alert className={pmRecord?.status === 'completed' ? 'border-green-200 bg-green-50' : 'border-yellow-200 bg-yellow-50'}>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {pmLoading ? (
              'Checking PM status...'
            ) : pmRecord?.status === 'completed' ? (
              '✓ Preventative maintenance completed'
            ) : (
              'Preventative maintenance required - must be completed before work order can be finished'
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Status Transitions */}
      {canUpdate && availableTransitions.length > 0 && workOrder.status !== 'completed' && workOrder.status !== 'cancelled' && (
        <div className="space-y-2">
          <label className="text-sm font-medium">Update Status</label>
          <div className="flex gap-2 flex-wrap">
            {availableTransitions.map((transition) => (
              <Button
                key={transition.status}
                variant="outline"
                size="sm"
                onClick={() => handleStatusUpdate(transition.status)}
                disabled={isUpdating || transition.disabled}
                title={transition.reason}
              >
                {isUpdating ? 'Updating...' : transition.label}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Completion Info */}
      {workOrder.completed_date && (
        <div className="text-sm text-muted-foreground">
          Completed on {new Date(workOrder.completed_date).toLocaleString()}
        </div>
      )}
    </div>
  );
};

export default EnhancedWorkOrderStatusManager;
