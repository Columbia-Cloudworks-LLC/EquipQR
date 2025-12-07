import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, User, Users, ChevronRight } from 'lucide-react';
import { useUnifiedPermissions } from '@/hooks/useUnifiedPermissions';
import WorkOrderCostSubtotal from '@/components/work-orders/WorkOrderCostSubtotal';
import PMProgressIndicator from '@/components/work-orders/PMProgressIndicator';

import { WorkOrder } from '@/services/supabaseDataService';

interface ExtendedWorkOrder extends WorkOrder {
  created_date: string;
  due_date?: string;
  estimated_hours?: number;
  completed_date?: string;
  has_pm?: boolean;
}

interface MobileWorkOrderCardProps {
  workOrder: ExtendedWorkOrder;
}

const MobileWorkOrderCard: React.FC<MobileWorkOrderCardProps> = ({ workOrder }) => {
  const navigate = useNavigate();
  const permissions = useUnifiedPermissions();

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'assigned':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'submitted':
      case 'accepted':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'on_hold':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatStatus = (status: string) => {
    return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Header */}
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-base leading-tight line-clamp-2">
                {workOrder.title}
              </h3>
              <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
            </div>
            
            <div className="flex gap-2 flex-wrap">
              <Badge className={getPriorityColor(workOrder.priority)} variant="outline">
                {workOrder.priority}
              </Badge>
              <Badge className={getStatusColor(workOrder.status)} variant="outline">
                {formatStatus(workOrder.status)}
              </Badge>
            </div>
            
            {workOrder.description && (
              <p className="text-sm text-muted-foreground line-clamp-2">
                {workOrder.description}
              </p>
            )}
          </div>

          {/* PM Progress */}
          {workOrder.has_pm && (
            <PMProgressIndicator 
              workOrderId={workOrder.id} 
              hasPM={workOrder.has_pm} 
            />
          )}

          {/* Key Details */}
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="h-3 w-3 text-muted-foreground" />
                <span className="text-muted-foreground">Created</span>
              </div>
              <span className="font-medium">
                {new Date(workOrder.created_date).toLocaleDateString()}
              </span>
            </div>

            {workOrder.due_date && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground">Due</span>
                </div>
                <span className="font-medium">
                  {new Date(workOrder.due_date).toLocaleDateString()}
                </span>
              </div>
            )}

            {workOrder.assigneeName && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground">Assigned</span>
                </div>
                <span className="font-medium truncate max-w-32">
                  {workOrder.assigneeName}
                </span>
              </div>
            )}

            {workOrder.teamName && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground">Team</span>
                </div>
                <span className="font-medium truncate max-w-32">
                  {workOrder.teamName}
                </span>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-2 border-t">
            {permissions.workOrders.getDetailedPermissions({ ...workOrder, organizationId: '' }).canEdit && (
              <WorkOrderCostSubtotal 
                workOrderId={workOrder.id}
                className="text-sm"
              />
            )}
            
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate(`/dashboard/work-orders/${workOrder.id}`)}
              className="ml-auto"
            >
              View Details
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default MobileWorkOrderCard;