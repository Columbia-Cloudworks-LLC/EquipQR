import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Edit, Menu, Clipboard, MapPin, Calendar, User } from 'lucide-react';
import { getPriorityColor, getStatusColor, formatStatus } from '@/utils/workOrderHelpers';
import { WorkOrderPrimaryActionButton } from './WorkOrderPrimaryActionButton';

interface WorkOrderDetailsMobileHeaderProps {
  workOrder: {
    id: string;
    title: string;
    priority: 'low' | 'medium' | 'high';
    status: 'submitted' | 'accepted' | 'assigned' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled';
    has_pm?: boolean;
    assignee_id?: string;
    created_by?: string;
    created_at?: string;
    equipment?: {
      name: string;
      status: string;
      location?: string;
    };
    team?: {
      name: string;
    };
  };
  canEdit: boolean;
  organizationId: string;
  onEditClick: () => void;
  onToggleSidebar: () => void;
}

export const WorkOrderDetailsMobileHeader: React.FC<WorkOrderDetailsMobileHeaderProps> = ({
  workOrder,
  canEdit,
  organizationId,
  onEditClick,
  onToggleSidebar
}) => {
  return (
    <div className="sticky top-0 z-10 bg-background border-b lg:hidden">
      <div className="p-4 space-y-3">
        {/* Top Row: Minimal Back Button and Actions */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" asChild className="p-2">
            <Link to="/dashboard/work-orders">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          
          <div className="flex items-center gap-1">
            {canEdit && (
              <Button variant="outline" size="sm" onClick={onEditClick} className="px-3">
                <Edit className="h-4 w-4" />
              </Button>
            )}
            <Button 
              variant="ghost" 
              size="sm"
              onClick={onToggleSidebar}
              className="p-2"
            >
              <Menu className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Work Order Title - Largest Heading */}
        <div className="space-y-2">
          <div className="flex items-start gap-2">
            <h1 className="text-xl font-bold leading-tight line-clamp-2 flex-1">
              {workOrder.title}
            </h1>
            {workOrder.has_pm && (
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs shrink-0 mt-1">
                <Clipboard className="h-3 w-3 mr-1" />
                PM
              </Badge>
            )}
          </div>

          {/* Critical Info Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Badge className={`${getPriorityColor(workOrder.priority)} text-xs`}>
                {workOrder.priority}
              </Badge>
              <Badge className={`${getStatusColor(workOrder.status)} text-xs`}>
                {formatStatus(workOrder.status)}
              </Badge>
            </div>
            
            {/* Primary Action Button */}
            <WorkOrderPrimaryActionButton 
              workOrder={workOrder}
              organizationId={organizationId}
            />
          </div>

          {/* Equipment & Location Info */}
          {workOrder.equipment && (
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Clipboard className="h-3 w-3" />
                <span className="font-medium">{workOrder.equipment.name}</span>
                <Badge variant="outline" className="text-xs ml-1">
                  {workOrder.equipment.status}
                </Badge>
              </div>
              {workOrder.equipment.location && (
                <div className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  <span>{workOrder.equipment.location}</span>
                </div>
              )}
            </div>
          )}

          {/* Team & Date Info */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            {workOrder.team && (
              <div className="flex items-center gap-1">
                <User className="h-3 w-3" />
                <span>{workOrder.team.name}</span>
              </div>
            )}
            {workOrder.created_at && (
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                <span>{new Date(workOrder.created_at).toLocaleDateString()}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};