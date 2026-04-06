import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, RotateCcw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { workOrderRevertService } from '@/features/work-orders/services/workOrderRevertService';
import { logger } from '@/utils/logger';
import type { WorkOrderLike } from '@/features/work-orders/utils/workOrderTypeConversion';

interface WorkOrderDetailsStatusLockWarningProps {
  workOrder: Pick<WorkOrderLike, 'id' | 'status'>;
  isWorkOrderLocked: boolean;
  baseCanAddNotes: boolean;
  isAdmin?: boolean;
  onStatusUpdate?: (newStatus: WorkOrderLike['status']) => void;
}

export const WorkOrderDetailsStatusLockWarning: React.FC<WorkOrderDetailsStatusLockWarningProps> = ({
  workOrder,
  isWorkOrderLocked,
  baseCanAddNotes,
  isAdmin = false,
  onStatusUpdate
}) => {
  const { toast } = useToast();
  const [isReverting, setIsReverting] = useState(false);

  const handleRevert = async () => {
    setIsReverting(true);
    try {
      const result = await workOrderRevertService.revertWorkOrderStatus(
        workOrder.id,
        'Reverted to accepted status by admin'
      );
      
      if (result.success) {
        toast({
          title: "Work Order Reverted",
          description: `Status changed from ${result.old_status} to ${result.new_status}`,
        });
        onStatusUpdate?.(result.new_status || 'accepted');
      } else {
        toast({
          title: "Revert Failed",
          description: result.error || "Failed to revert work order status",
          variant: "destructive",
        });
      }
    } catch (error) {
      logger.error('Failed to revert work order status', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsReverting(false);
    }
  };

  if (!isWorkOrderLocked || !baseCanAddNotes) return null;

  const canRevert = isAdmin && (workOrder.status === 'completed' || workOrder.status === 'cancelled');

  return (
    <div className="rounded-lg border border-warning/30 bg-warning/10 dark:bg-warning/10 dark:border-warning/50 py-2.5 px-3 space-y-2">
      <div className="flex items-start gap-2 text-warning dark:text-warning">
        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
        <p className="text-sm font-medium">
          This work order is {workOrder.status}. Notes, images, and costs cannot be modified.
        </p>
      </div>
      {canRevert && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleRevert}
          disabled={isReverting}
          className="w-full border-warning/40 text-warning hover:bg-warning/20 dark:border-warning/50 dark:text-warning dark:hover:bg-warning/20"
        >
          <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
          {isReverting ? 'Reverting...' : 'Revert to Accepted'}
        </Button>
      )}
    </div>
  );
};


