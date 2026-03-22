import React from "react";
import { Link } from "react-router-dom";
import { ChevronRight, ClipboardList } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { getStatusColor, formatStatus } from "@/features/work-orders/utils/workOrderHelpers";
import { cn } from "@/lib/utils";

interface RecentWorkOrder {
  id: string;
  title: string;
  priority: string;
  assigneeName?: string | null;
  status: string;
  created_date?: string;
}

interface DashboardRecentWorkOrdersCardProps {
  workOrders: RecentWorkOrder[];
  isLoading: boolean;
  hasMore: boolean;
}

function getStatusLeftBorder(status: string): string {
  switch (status) {
    case 'completed': return 'bg-success';
    case 'in_progress': return 'bg-warning';
    case 'overdue': return 'bg-destructive';
    case 'open': return 'bg-info';
    case 'assigned': return 'bg-blue-400';
    case 'cancelled': return 'bg-muted-foreground/40';
    default: return 'bg-muted-foreground/40';
  }
}

export const DashboardRecentWorkOrdersCard: React.FC<DashboardRecentWorkOrdersCardProps> = ({
  workOrders,
  isLoading,
  hasMore,
}) => {
  return (
    <section aria-labelledby="recent-work-orders-heading">
      <Card>
        <CardHeader>
          <CardTitle as="h2" id="recent-work-orders-heading" className="flex items-center gap-2 text-base">
            <ClipboardList className="h-4 w-4" />
            Recent Work Orders
          </CardTitle>
          <CardDescription className="opacity-75">Latest work order activity</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-12 animate-pulse rounded bg-muted" />
              ))}
            </div>
          ) : workOrders.length > 0 ? (
            <div className="divide-y divide-border/50">
              {workOrders.map((order) => {
                return (
                  <Link
                    key={order.id}
                    to={`/dashboard/work-orders/${order.id}`}
                    className={cn(
                      "flex items-center gap-3 py-2.5 pl-3 pr-2 -mx-3 transition-colors",
                      "hover:bg-muted/60 dark:hover:bg-white/[0.04]",
                      "active:bg-white/5 dark:active:bg-white/[0.03]",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    )}
                  >
                    <div className={cn("w-0.5 self-stretch flex-shrink-0 rounded-full", getStatusLeftBorder(order.status))} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium leading-tight">{order.title}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {order.priority} priority · {order.assigneeName || 'Unassigned'}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn("ml-1 flex-shrink-0 text-xs", getStatusColor(order.status))}
                    >
                      {formatStatus(order.status)}
                    </Badge>
                    <ChevronRight className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground/50" aria-hidden />
                  </Link>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-2">No work orders found</p>
          )}
        </CardContent>
        {!isLoading && hasMore && (
          <CardFooter className="pt-0 border-t border-border/50">
            <Link
              to="/dashboard/work-orders"
              className="inline-flex items-center gap-1 min-h-[44px] text-sm text-muted-foreground hover:text-foreground active:text-foreground transition-colors touch-manipulation"
            >
              View all work orders
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </CardFooter>
        )}
      </Card>
    </section>
  );
};
