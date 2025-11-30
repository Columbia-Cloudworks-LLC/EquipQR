import React, { memo, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, User, AlertTriangle } from 'lucide-react';
import { WorkOrder } from '@/services/supabaseDataService';

interface OptimizedWorkOrderCardProps {
  workOrder: WorkOrder;
  onViewClick?: (id: string) => void;
  onEditClick?: (id: string) => void;
}

// OPTIMIZED: Memoized component with computed values
const OptimizedWorkOrderCard = memo(({ 
  workOrder, 
  onViewClick, 
  onEditClick 
}: OptimizedWorkOrderCardProps) => {
  
  // OPTIMIZED: Memoize expensive computations
  const computedData = useMemo(() => {
    const getStatusVariant = (status: WorkOrder['status']): "default" | "secondary" | "outline" | "destructive" => {
      switch (status) {
        case 'completed':
          return 'default';
        case 'in_progress':
          return 'secondary';
        case 'submitted':
        case 'accepted':
          return 'outline';
        case 'cancelled':
          return 'destructive';
        default:
          return 'outline';
      }
    };

    const getPriorityVariant = (priority: WorkOrder['priority']): "default" | "secondary" | "outline" | "destructive" => {
      switch (priority) {
        case 'high':
          return 'destructive';
        case 'medium':
          return 'secondary';
        case 'low':
          return 'outline';
        default:
          return 'outline';
      }
    };

    const isOverdue = workOrder.due_date && 
      new Date(workOrder.due_date) < new Date() && 
      workOrder.status !== 'completed';

    const formattedDueDate = workOrder.due_date 
      ? new Date(workOrder.due_date).toLocaleDateString()
      : null;

    const formattedCreatedDate = new Date(workOrder.created_date).toLocaleDateString();

    return {
      statusVariant: getStatusVariant(workOrder.status),
      priorityVariant: getPriorityVariant(workOrder.priority),
      isOverdue,
      formattedDueDate,
      formattedCreatedDate
    };
  }, [workOrder.status, workOrder.priority, workOrder.due_date, workOrder.created_date]);

  return (
    <Card className="h-full hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-lg leading-tight line-clamp-2">
            {workOrder.title}
          </CardTitle>
          <div className="flex flex-col gap-1">
            <Badge variant={computedData.statusVariant}>
              {workOrder.status.replace('_', ' ')}
            </Badge>
            <Badge variant={computedData.priorityVariant}>
              {workOrder.priority}
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground line-clamp-2">
          {workOrder.description}
        </p>

        <div className="space-y-2 text-sm">
          {workOrder.equipmentName && (
            <div className="flex items-center gap-2">
              <span className="font-medium">Equipment:</span>
              <span className="text-muted-foreground truncate">
                {workOrder.equipmentName}
              </span>
            </div>
          )}
          
          {workOrder.assigneeName && (
            <div className="flex items-center gap-2">
              <User className="h-3 w-3" />
              <span className="text-muted-foreground truncate">
                {workOrder.assigneeName}
              </span>
            </div>
          )}

          {workOrder.teamName && (
            <div className="flex items-center gap-2">
              <span className="font-medium">Team:</span>
              <span className="text-muted-foreground truncate">
                {workOrder.teamName}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            Created: {computedData.formattedCreatedDate}
          </div>
          
          {computedData.formattedDueDate && (
            <div className={`flex items-center gap-1 ${
              computedData.isOverdue ? 'text-destructive' : ''
            }`}>
              {computedData.isOverdue && <AlertTriangle className="h-3 w-3" />}
              Due: {computedData.formattedDueDate}
            </div>
          )}
        </div>

        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => onEditClick?.(workOrder.id)}
          >
            Edit
          </Button>
          <Button
            variant="default"
            size="sm"
            className="flex-1"
            onClick={() => onViewClick?.(workOrder.id)}
          >
            View Details
          </Button>
        </div>
      </CardContent>
    </Card>
  );
});

OptimizedWorkOrderCard.displayName = 'OptimizedWorkOrderCard';

export default OptimizedWorkOrderCard;