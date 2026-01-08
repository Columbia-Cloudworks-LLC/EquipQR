import React from "react";
import { Link } from "react-router-dom";
import { AlertTriangle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface HighPriorityWorkOrder {
  id: string;
  title: string;
  createdDate: string;
  dueDate?: string | null;
}

interface DashboardHighPriorityWorkOrdersCardProps {
  workOrders: HighPriorityWorkOrder[];
}

export const DashboardHighPriorityWorkOrdersCard: React.FC<DashboardHighPriorityWorkOrdersCardProps> = ({ workOrders }) => {
  if (workOrders.length === 0) {
    return null;
  }

  return (
    <section aria-labelledby="high-priority-heading">
      <Card>
        <CardHeader>
          <CardTitle id="high-priority-heading" className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            High Priority Work Orders
          </CardTitle>
          <CardDescription>{workOrders.length} work orders require immediate attention</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {workOrders.map((order) => (
              <Link
                key={order.id}
                to={`/dashboard/work-orders/${order.id}`}
                className="flex items-center justify-between rounded-lg border border-destructive/20 p-3 transition-colors hover:bg-destructive/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 font-medium">{order.title}</p>
                  <p className="text-sm text-muted-foreground">
                    Created: {new Date(order.createdDate).toLocaleDateString()}
                    {order.dueDate && <> • Due: {new Date(order.dueDate).toLocaleDateString()}</>}
                  </p>
                </div>
                <Badge variant="destructive" className="ml-2 flex-shrink-0">
                  High Priority
                </Badge>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </section>
  );
};

