import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { FileText, Download, UserPlus, RotateCcw, Eye, Trash2, Zap, CheckCircle, Play } from 'lucide-react';
import { useUnifiedPermissions } from '@/hooks/useUnifiedPermissions';
import { useNavigate } from 'react-router-dom';
import { generatePMChecklistPDF } from '@/services/workOrderPDFService';
import { generateCostsCSV } from '@/services/workOrderCSVService';
import { useToast } from '@/hooks/use-toast';
import { useDeleteWorkOrder } from '@/hooks/useDeleteWorkOrder';
import { useWorkOrderImageCount } from '@/hooks/useWorkOrderImageCount';
import { useWorkOrderStatusUpdate } from '@/hooks/useWorkOrderStatusUpdate';
import { WorkOrderLike, ensureWorkOrderData } from '@/utils/workOrderTypeConversion';

interface WorkOrderQuickActionsProps {
  workOrder: WorkOrderLike;
  onAssignClick?: () => void;
  onReopenClick?: () => void;
  onDeleteSuccess?: () => void;
  onStatusUpdate?: (workOrderId: string, newStatus: string) => void;
  hideReassign?: boolean;
}

export const WorkOrderQuickActions: React.FC<WorkOrderQuickActionsProps> = ({
  workOrder,
  onAssignClick,
  onReopenClick,
  onDeleteSuccess,
  onStatusUpdate,
  hideReassign = false
}) => {
  const permissions = useUnifiedPermissions();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isGeneratingCSV, setIsGeneratingCSV] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  const deleteWorkOrderMutation = useDeleteWorkOrder();
  const statusUpdateMutation = useWorkOrderStatusUpdate();
  const { data: imageData } = useWorkOrderImageCount(workOrder?.id);

  const workOrderPermissions = permissions.workOrders.getDetailedPermissions(ensureWorkOrderData(workOrder));
  
  const canViewPMChecklist = workOrder.has_pm;
  const canDownloadPMPDF = workOrder.has_pm;
  const canDownloadCosts = workOrderPermissions.canEdit; // Only for managers/admins
  const canReassign = workOrderPermissions.canEdit && ['submitted', 'accepted', 'assigned'].includes(workOrder.status);
  const canReopen = workOrderPermissions.canEdit && ['completed', 'cancelled'].includes(workOrder.status);
  const canDelete = permissions.hasRole(['owner', 'admin']); // Only org admins can delete

  const handleViewPMChecklist = () => {
    navigate(`/dashboard/work-orders/${workOrder.id}?tab=pm`);
  };

  const handleDownloadPMPDF = async () => {
    if (isGeneratingPDF) return;
    
    setIsGeneratingPDF(true);
    try {
      await generatePMChecklistPDF(workOrder.id);
      toast({
        title: "PDF Generated",
        description: "PM checklist PDF has been downloaded",
      });
    } catch {
      toast({
        title: "Error",
        description: "Failed to generate PM PDF",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleDownloadCosts = async () => {
    if (isGeneratingCSV) return;
    
    setIsGeneratingCSV(true);
    try {
      await generateCostsCSV(workOrder.id);
      toast({
        title: "CSV Generated",
        description: "Work order costs CSV has been downloaded",
      });
    } catch {
      toast({
        title: "Error", 
        description: "Failed to generate costs CSV",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingCSV(false);
    }
  };

  const handleDeleteClick = () => {
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      await deleteWorkOrderMutation.mutateAsync(workOrder.id);
      setShowDeleteDialog(false);
      onDeleteSuccess?.();
    } catch {
      // Error is handled in the mutation
    }
  };

  const handleStatusUpdate = async (newStatus: string) => {
    try {
      await statusUpdateMutation.mutateAsync({
        workOrderId: workOrder.id,
        newStatus: newStatus as any
      });
      onStatusUpdate?.(workOrder.id, newStatus);
    } catch {
      // Error is handled in the mutation
    }
  };

  const handleAssignToMe = () => {
    onAssignClick?.();
  };

  const handleAccept = () => {
    handleStatusUpdate('accepted');
  };

  const handleStartWork = () => {
    handleStatusUpdate('in_progress');
  };

  const handleComplete = () => {
    handleStatusUpdate('completed');
  };

  const actions = [
    // Workflow Actions
    {
      key: 'assign-to-me',
      label: 'Assign to Me',
      icon: UserPlus,
      show: workOrder.status === 'submitted' && !workOrder.assigneeName,
      onClick: handleAssignToMe
    },
    {
      key: 'accept',
      label: 'Accept',
      icon: CheckCircle,
      show: workOrder.status === 'submitted',
      onClick: handleAccept
    },
    {
      key: 'start-work',
      label: 'Start Work',
      icon: Play,
      show: workOrder.status === 'assigned',
      onClick: handleStartWork
    },
    {
      key: 'complete',
      label: 'Complete',
      icon: CheckCircle,
      show: workOrder.status === 'in_progress',
      onClick: handleComplete
    },
    // Separator
    {
      key: 'separator-1',
      label: '---',
      icon: null,
      show: true,
      onClick: null,
      separator: true
    },
    // Document Actions
    {
      key: 'view-pm',
      label: 'View PM Checklist',
      icon: Eye,
      show: canViewPMChecklist,
      onClick: handleViewPMChecklist
    },
    {
      key: 'download-pm',
      label: 'Download PM PDF',
      icon: FileText,
      show: canDownloadPMPDF,
      onClick: handleDownloadPMPDF,
      loading: isGeneratingPDF
    },
    {
      key: 'download-costs',
      label: 'Download Costs CSV',
      icon: Download,
      show: canDownloadCosts,
      onClick: handleDownloadCosts,
      loading: isGeneratingCSV
    },
    // Separator
    {
      key: 'separator-2',
      label: '---',
      icon: null,
      show: true,
      onClick: null,
      separator: true
    },
    // Admin Actions
    {
      key: 'reassign',
      label: 'Reassign',
      icon: UserPlus,
      show: canReassign && !hideReassign,
      onClick: onAssignClick
    },
    {
      key: 'reopen',
      label: 'Reopen',
      icon: RotateCcw,
      show: canReopen,
      onClick: onReopenClick
    },
    {
      key: 'delete',
      label: 'Delete',
      icon: Trash2,
      show: canDelete,
      onClick: handleDeleteClick,
      destructive: true
    }
  ];

  const visibleActions = actions.filter(action => action.show && !action.separator);

  if (visibleActions.length === 0) return null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-8">
            <Zap className="h-3 w-3 mr-1" />
            Take Action
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {actions.map((action, index) => {
            if (action.separator) {
              return <div key={action.key} className="border-t my-1" />;
            }
            if (!action.show) return null;
            
            return (
              <DropdownMenuItem
                key={action.key}
                onClick={action.onClick}
                disabled={action.loading}
                className={`gap-2 ${action.destructive ? 'text-destructive focus:text-destructive' : ''}`}
              >
                {action.icon && <action.icon className="h-4 w-4" />}
                {action.label}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>

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