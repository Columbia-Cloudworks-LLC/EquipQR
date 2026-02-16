import React from "react";
import { Link } from "react-router-dom";
import { ChevronRight, ClipboardList } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

interface RecentWorkOrder {
  id: string;
  title: string;
  priority: string;
  assigneeName?: string | null;
  status: string;
}

interface DashboardRecentWorkOrdersCardProps {
  workOrders: RecentWorkOrder[];
  isLoading: boolean;
  hasMore: boolean;
}

function getWorkOrderStatusBadgeVariant(status: string): "default" | "secondary" | "outline" {
  if (status === "completed") return "default";
  if (status === "in_progress") return "secondary";
  return "outline";
}

function formatWorkOrderStatus(status: string): string {
  return status.replace("_", " ");
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
          <CardTitle as="h2" id="recent-work-orders-heading" className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            Recent Work Orders
          </CardTitle>
          <CardDescription>Latest work order activity</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 animate-pulse rounded bg-muted" />
              ))}
            </div>
          ) : workOrders.length > 0 ? (
            <div className="space-y-4">
              {workOrders.map((order) => (
                <Link
                  key={order.id}
                  to={`/dashboard/work-orders/${order.id}`}
                  className="flex items-center justify-between rounded-lg p-2 -m-2 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 font-medium">{order.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {order.priority} priority • {order.assigneeName || "Unassigned"}
                    </p>
                  </div>
                  <Badge
                    variant={getWorkOrderStatusBadgeVariant(order.status)}
                    className="ml-2 flex-shrink-0"
                  >
                    {formatWorkOrderStatus(order.status)}
                  </Badge>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">No work orders found</p>
          )}
        </CardContent>
        {hasMore && !isLoading && (
          <CardFooter>
            <Button asChild variant="secondary" className="w-full">
              <Link to="/dashboard/work-orders" className="inline-flex items-center justify-center gap-2">
                View all
                <ChevronRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardFooter>
        )}
      </Card>
    </section>
  );
};

