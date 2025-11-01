import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, RotateCcw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { workOrderRevertService } from '@/services/workOrderRevertService';
import { logger } from '@/utils/logger';
import type { WorkOrderLike } from '@/utils/workOrderTypeConversion';

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
    <div className="px-4 lg:px-6">
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-800">
              <AlertCircle className="h-5 w-5" />
              <p className="text-sm font-medium">
                This work order is {workOrder.status}. Notes, images, and costs cannot be added or modified.
              </p>
            </div>
            {canRevert && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRevert}
                disabled={isReverting}
                className="border-amber-300 text-amber-800 hover:bg-amber-100"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                {isReverting ? 'Reverting...' : 'Revert to Accepted'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};