import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ClipboardList, ChevronRight, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RecentWorkOrderItem } from '@/features/teams/services/teamStatsService';

interface TeamRecentWorkOrdersProps {
  teamId: string;
  workOrders: RecentWorkOrderItem[];
  isLoading: boolean;
}

function getWorkOrderStatusBadgeVariant(status: string): 'default' | 'secondary' | 'outline' | 'destructive' {
  if (status === 'completed') return 'default';
  if (status === 'in_progress') return 'secondary';
  if (status === 'cancelled') return 'destructive';
  return 'outline';
}

function formatWorkOrderStatus(status: string): string {
  return status.replace(/_/g, ' ');
}

function getPriorityColor(priority: string): string {
  switch (priority) {
    case 'critical':
      return 'text-destructive';
    case 'high':
      return 'text-warning';
    case 'medium':
      return 'text-primary';
    default:
      return 'text-muted-foreground';
  }
}

function isOverdue(dueDate: string | null, status: string): boolean {
  if (!dueDate || ['completed', 'cancelled'].includes(status)) return false;
  return new Date(dueDate) < new Date();
}

/**
 * Recent work orders preview component for team details page
 */
const TeamRecentWorkOrders: React.FC<TeamRecentWorkOrdersProps> = ({
  teamId,
  workOrders,
  isLoading,
}) => {
  // Don't render if no work orders and not loading
  if (!isLoading && workOrders.length === 0) {
    return null;
  }

  return (
    <Card className="shadow-elevation-2">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <ClipboardList className="h-5 w-5" />
          Recent Work Orders
        </CardTitle>
        <CardDescription>
          Latest work order activity for this team
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center justify-between p-2">
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
                <Skeleton className="h-5 w-20" />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {workOrders.map((order) => {
              const overdue = isOverdue(order.dueDate, order.status);
              return (
                <Link
                  key={order.id}
                  to={`/dashboard/work-orders/${order.id}`}
                  className={cn(
                    'flex items-center justify-between rounded-lg p-3 border transition-all duration-fast',
                    'hover:bg-muted/50 hover:shadow-sm',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                    overdue && 'border-warning bg-warning/5'
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium line-clamp-1">{order.title}</p>
                      {overdue && (
                        <AlertTriangle className="h-4 w-4 text-warning flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      <span className={getPriorityColor(order.priority)}>
                        {order.priority}
                      </span>
                      {' priority • '}
                      {order.assigneeName || 'Unassigned'}
                    </p>
                  </div>
                  <Badge
                    variant={getWorkOrderStatusBadgeVariant(order.status)}
                    className="ml-2 flex-shrink-0"
                  >
                    {formatWorkOrderStatus(order.status)}
                  </Badge>
                </Link>
              );
            })}
          </div>
        )}
      </CardContent>
      {workOrders.length > 0 && (
        <CardFooter className="pt-0">
          <Button asChild variant="secondary" className="w-full">
            <Link
              to={`/dashboard/work-orders?team=${teamId}`}
              className="inline-flex items-center justify-center gap-2"
            >
              View all work orders
              <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
        </CardFooter>
      )}
    </Card>
  );
};

export default TeamRecentWorkOrders;
