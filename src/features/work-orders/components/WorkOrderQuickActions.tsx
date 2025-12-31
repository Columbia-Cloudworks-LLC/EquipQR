import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Download, 
  Eye, 
  Plus, 
  Camera,
  CheckCircle,
  Clock,
  AlertTriangle
} from 'lucide-react';
import { QuickBooksExportButton } from './QuickBooksExportButton';

interface WorkOrderQuickActionsProps {
  workOrder: {
    id: string;
    title: string;
    priority: 'low' | 'medium' | 'high';
    status: 'submitted' | 'accepted' | 'assigned' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled';
    has_pm?: boolean;
    pm_status?: 'pending' | 'in_progress' | 'completed' | 'cancelled';
    pm_progress?: number;
    pm_total?: number;
  };
  teamId?: string | null;
  equipment?: {
    id: string;
    name: string;
  };
  onStatusChange?: (status: string) => void;
  onPriorityChange?: (priority: string) => void;
  onViewEquipment?: () => void;
  onAddNote?: () => void;
  onUploadImage?: () => void;
  onDownloadPDF?: () => void;
  onViewPMDetails?: () => void;
  canEdit?: boolean;
}

export const WorkOrderQuickActions: React.FC<WorkOrderQuickActionsProps> = ({
  workOrder,
  teamId,
  equipment,
  onStatusChange,
  onPriorityChange,
  onViewEquipment,
  onAddNote,
  onUploadImage,
  onDownloadPDF,
  onViewPMDetails,
  canEdit = false
}) => {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      case 'in_progress':
        return <Clock className="h-4 w-4" />;
      case 'on_hold':
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getPMStatusIcon = (status?: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'in_progress':
        return <Clock className="h-4 w-4 text-blue-600" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-gray-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  return (
    <div className="space-y-3">
      {/* Status and Priority Controls */}
      <div className="grid grid-cols-2 gap-3">
        {canEdit ? (
          <>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Status</label>
              <Select value={workOrder.status} onValueChange={onStatusChange}>
                <SelectTrigger className="h-8 text-sm">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(workOrder.status)}
                    <SelectValue />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="submitted">Submitted</SelectItem>
                  <SelectItem value="accepted">Accepted</SelectItem>
                  <SelectItem value="assigned">Assigned</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="on_hold">On Hold</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Priority</label>
              <Select value={workOrder.priority} onValueChange={onPriorityChange}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        ) : (
          <div className="col-span-2 flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {getStatusIcon(workOrder.status)}
              <span className="ml-1 capitalize">{workOrder.status.replace('_', ' ')}</span>
            </Badge>
            <Badge variant="outline" className="text-xs">
              {workOrder.priority} Priority
            </Badge>
          </div>
        )}
      </div>

      {/* Primary Actions */}
      <div className="grid grid-cols-2 gap-2">
        {equipment && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onViewEquipment}
            className="h-8 text-xs"
          >
            <Eye className="h-3 w-3 mr-1" />
            View Equipment
          </Button>
        )}
        
        {workOrder.has_pm && onViewPMDetails && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onViewPMDetails}
            className="h-8 text-xs"
          >
            {getPMStatusIcon(workOrder.pm_status)}
            <span className="ml-1">
              PM {workOrder.pm_progress && workOrder.pm_total 
                ? `${workOrder.pm_progress}/${workOrder.pm_total}` 
                : 'Details'
              }
            </span>
          </Button>
        )}
      </div>

      {/* Secondary Actions */}
      <div className="grid grid-cols-3 gap-2">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onAddNote}
          className="h-8 text-xs"
        >
          <Plus className="h-3 w-3 mr-1" />
          Note
        </Button>
        
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onUploadImage}
          className="h-8 text-xs"
        >
          <Camera className="h-3 w-3 mr-1" />
          Photo
        </Button>
        
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onDownloadPDF}
          className="h-8 text-xs"
        >
          <Download className="h-3 w-3 mr-1" />
          PDF
        </Button>
      </div>

      {/* Export Actions */}
      <div className="flex items-center gap-2">
        <QuickBooksExportButton
          workOrderId={workOrder.id}
          teamId={teamId ?? null}
          workOrderStatus={workOrder.status}
        />
      </div>
    </div>
  );
};


