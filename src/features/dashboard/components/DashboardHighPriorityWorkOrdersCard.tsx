import React from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, ChevronRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { WorkOrderStatus } from "@/features/work-orders/types/workOrder";
import { isOverdue } from "@/features/work-orders/utils/workOrderHelpers";

interface HighPriorityWorkOrder {
  id: string;
  title: string;
  createdDate: string;
  dueDate?: string | null;
  status: string;
}

interface DashboardHighPriorityWorkOrdersCardProps {
  workOrders: HighPriorityWorkOrder[];
}

function getOverdueLabel(dueDate: string | null | undefined, status: string): string | null {
  if (!dueDate || !isOverdue(dueDate, status as WorkOrderStatus)) return null;
  const now = new Date();
  const due = new Date(dueDate);
  const days = Math.floor((now.getTime() - due.getTime()) / (24 * 60 * 60 * 1000));
  return days <= 0 ? "Overdue" : `Overdue by ${days} day${days === 1 ? "" : "s"}`;
}

export const DashboardHighPriorityWorkOrdersCard: React.FC<DashboardHighPriorityWorkOrdersCardProps> = ({ workOrders }) => {
  if (workOrders.length === 0) {
    return null;
  }

  return (
    <section aria-labelledby="high-priority-heading">
      <Card>
        <CardHeader>
          <CardTitle as="h2" id="high-priority-heading" className="flex items-center gap-2 text-base text-destructive">
            <AlertTriangle className="h-4 w-4" />
            High Priority Work Orders
          </CardTitle>
          <CardDescription>{workOrders.length} work orders require immediate attention</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {workOrders.map((order) => {
              const overdueLabel = getOverdueLabel(order.dueDate ?? null, order.status);
              return (
                <Link
                  key={order.id}
                  to={`/dashboard/work-orders/${order.id}`}
                  className="flex items-center justify-between rounded-lg border border-destructive/20 p-3 transition-colors hover:bg-destructive/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 font-medium">{order.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {overdueLabel ? (
                        <span className="text-destructive font-medium">{overdueLabel}</span>
                      ) : (
                        <>
                          Created: {new Date(order.createdDate).toLocaleDateString()}
                          {order.dueDate && <> • Due: {new Date(order.dueDate).toLocaleDateString()}</>}
                        </>
                      )}
                    </p>
                  </div>
                  <div className="ml-2 flex flex-shrink-0 items-center gap-2">
                    <Badge variant="destructive">High Priority</Badge>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden />
                  </div>
                </Link>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </section>
  );
};

