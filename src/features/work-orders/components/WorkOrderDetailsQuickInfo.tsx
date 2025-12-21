import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Calendar, Clock, User, Users, Wrench, Clipboard, Trash2 } from 'lucide-react';
import { useUnifiedPermissions } from '@/hooks/useUnifiedPermissions';
import { useDeleteWorkOrder } from '@/features/work-orders/hooks/useDeleteWorkOrder';
import { useWorkOrderImageCount } from '@/features/work-orders/hooks/useWorkOrderImageCount';

import { useNavigate } from 'react-router-dom';
import { WorkOrderData, EquipmentData, PermissionLevels, PMData } from '@/features/work-orders/types/workOrderDetails';

interface WorkOrderDetailsQuickInfoProps {
  workOrder: WorkOrderData;
  equipment: EquipmentData;
  formMode: string;
  permissionLevels: PermissionLevels;
  pmData: PMData;
}

export const WorkOrderDetailsQuickInfo: React.FC<WorkOrderDetailsQuickInfoProps> = ({
  workOrder,
  equipment,
  formMode,
  permissionLevels,
  pmData
}) => {
  const permissions = useUnifiedPermissions();
  const deleteWorkOrderMutation = useDeleteWorkOrder();
  const { data: imageData } = useWorkOrderImageCount(workOrder?.id);
  
  const navigate = useNavigate();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const canDelete = permissions.hasRole(['owner', 'admin']);

  const handleDeleteClick = () => {
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      await deleteWorkOrderMutation.mutateAsync(workOrder.id);
      setShowDeleteDialog(false);
      navigate('/dashboard/work-orders');
    } catch {
      // Error is handled in the mutation
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Info</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="font-medium">Created</div>
              <div className="text-muted-foreground">
                {new Date(workOrder.created_date).toLocaleDateString()}
              </div>
            </div>
          </div>

          {workOrder.due_date && (
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="font-medium">
                  {formMode === 'requestor' && workOrder.status === 'submitted' ? 'Preferred Due Date' : 'Due Date'}
                </div>
                <div className="text-muted-foreground">
                  {new Date(workOrder.due_date).toLocaleDateString()}
                </div>
              </div>
            </div>
          )}

          {/* Only show assignment info to managers or if assigned to user */}
          {(permissionLevels.isManager || workOrder.assigneeName) && workOrder.assigneeName && (
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="font-medium">Assigned to</div>
                <div className="text-muted-foreground">{workOrder.assigneeName}</div>
              </div>
            </div>
          )}

          {(permissionLevels.isManager || workOrder.teamName) && workOrder.teamName && (
            <div className="flex items-center gap-2 text-sm">
              <Users className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="font-medium">Team</div>
                <div className="text-muted-foreground">{workOrder.teamName}</div>
              </div>
            </div>
          )}

          {permissionLevels.isManager && workOrder.estimated_hours && (
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="font-medium">Estimated Hours</div>
                <div className="text-muted-foreground">{workOrder.estimated_hours}h</div>
              </div>
            </div>
          )}

          {/* PM Status in Quick Info */}
          {workOrder.has_pm && pmData && (
            <div className="flex items-center gap-2 text-sm">
              <Clipboard className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="font-medium">PM Status</div>
                <div className="text-muted-foreground">
                  {pmData.status.replace('_', ' ').toUpperCase()}
                </div>
              </div>
            </div>
          )}

          {equipment && (
            <>
              <Separator />
              <div className="flex items-center gap-2 text-sm">
                <Wrench className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="font-medium">Equipment</div>
                  <Link 
                    to={`/dashboard/equipment/${equipment.id}`}
                    className="text-primary hover:underline"
                  >
                    {equipment.name}
                  </Link>
                </div>
              </div>
            </>
          )}

          {canDelete && (
            <>
              <Separator />
              <div className="pt-2">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDeleteClick}
                  disabled={deleteWorkOrderMutation.isPending}
                  className="w-full"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {deleteWorkOrderMutation.isPending ? 'Deleting...' : 'Delete Work Order'}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Work Order</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this work order? This action is irreversible and will permanently remove:
              <ul className="mt-2 space-y-1 text-sm">
                <li>• Work order details and description</li>
                <li>• All notes and comments</li>
                <li>• Cost records and estimates</li>
                <li>• Status history</li>
                <li>• Preventative maintenance records</li>
                {imageData && imageData.count > 0 && (
                  <li className="flex items-center gap-2">
                    • All uploaded images
                    <Badge variant="destructive" className="text-xs">
                      {imageData.count} image{imageData.count !== 1 ? 's' : ''}
                    </Badge>
                  </li>
                )}
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteWorkOrderMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleteWorkOrderMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteWorkOrderMutation.isPending ? 'Deleting...' : 'Delete Permanently'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};


