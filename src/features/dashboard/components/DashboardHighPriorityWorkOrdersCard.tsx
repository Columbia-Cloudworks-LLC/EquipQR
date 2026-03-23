import React from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, ChevronRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { WorkOrderStatus } from "@/features/work-orders/types/workOrder";
import { isOverdue } from "@/features/work-orders/utils/workOrderHelpers";
import { cn } from "@/lib/utils";

interface HighPriorityWorkOrder {
  id: string;
  title: string;
  createdDate: string;
  dueDate?: string | null;
  status: string;
  equipmentName?: string;
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

function getOverdueDays(dueDate: string | null | undefined, status: string): number {
  if (!dueDate || !isOverdue(dueDate, status as WorkOrderStatus)) return 0;
  const now = new Date();
  const due = new Date(dueDate);
  return Math.floor((now.getTime() - due.getTime()) / (24 * 60 * 60 * 1000));
}

/** Compact inline alert strip used when only a single high-priority item exists. */
const SingleItemAlertStrip: React.FC<{ order: HighPriorityWorkOrder }> = ({ order }) => {
  const overdueLabel = getOverdueLabel(order.dueDate ?? null, order.status);
  return (
    <Link
      to={`/dashboard/work-orders/${order.id}`}
      className={cn(
        "flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/[0.04] dark:bg-destructive/[0.08]",
        "px-4 py-3 transition-colors",
        "hover:bg-destructive/[0.08] dark:hover:bg-destructive/[0.14]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      )}
      aria-label={`High priority: ${order.title}${overdueLabel ? ` — ${overdueLabel}` : ""}`}
    >
      <AlertTriangle className="h-4 w-4 flex-shrink-0 text-destructive" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-destructive">{order.title}</p>
        {(order.equipmentName || overdueLabel) && (
          <p className="truncate text-xs text-destructive/70">
            {overdueLabel ?? order.equipmentName}
          </p>
        )}
      </div>
      <ChevronRight className="h-4 w-4 flex-shrink-0 text-destructive/60" aria-hidden />
    </Link>
  );
};

export const DashboardHighPriorityWorkOrdersCard: React.FC<DashboardHighPriorityWorkOrdersCardProps> = ({ workOrders }) => {
  if (workOrders.length === 0) {
    return null;
  }

  if (workOrders.length === 1) {
    return (
      <section aria-labelledby="high-priority-heading-single">
        <h2 id="high-priority-heading-single" className="sr-only">High Priority Work Orders</h2>
        <SingleItemAlertStrip order={workOrders[0]} />
      </section>
    );
  }

  return (
    <section aria-labelledby="high-priority-heading">
      <Card className="overflow-hidden border-destructive/30 bg-destructive/[0.03] dark:bg-destructive/[0.06]">
        <CardHeader>
          <CardTitle as="h2" id="high-priority-heading" className="flex items-center gap-2 text-base text-destructive">
            <AlertTriangle className="h-4 w-4" />
            High Priority Work Orders
          </CardTitle>
          <CardDescription>{workOrders.length} work orders require immediate attention</CardDescription>
        </CardHeader>
        <CardContent className="pt-0 px-0">
          <div className="divide-y divide-border/50">
            {workOrders.map((order) => {
              const overdueLabel = getOverdueLabel(order.dueDate ?? null, order.status);
              const overdueDays = getOverdueDays(order.dueDate ?? null, order.status);
              const isCriticalOverdue = overdueDays > 30;
              return (
                <Link
                  key={order.id}
                  to={`/dashboard/work-orders/${order.id}`}
                  className={cn(
                    "flex items-center gap-3 px-4 sm:px-5 py-3 transition-colors",
                    "hover:bg-destructive/[0.06] dark:hover:bg-destructive/[0.10]",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
                    isCriticalOverdue && "bg-destructive/10 dark:bg-destructive/15"
                  )}
                >
                  <div className="w-0.5 self-stretch flex-shrink-0 rounded-full bg-destructive" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium leading-tight">{order.title}</p>
                    {order.equipmentName && (
                      <p className="text-xs text-muted-foreground truncate">
                        {order.equipmentName}
                      </p>
                    )}
                    {overdueLabel && (
                      <div className="mt-1">
                        <Badge variant="destructive" className="text-xs">
                          {isCriticalOverdue && <AlertTriangle className="mr-1 h-3 w-3" aria-hidden />}
                          {overdueLabel}
                        </Badge>
                      </div>
                    )}
                    {!overdueLabel && (
                      <p className="text-xs text-muted-foreground">
                        Created: {new Date(order.createdDate).toLocaleDateString()}
                        {order.dueDate && <> · Due: {new Date(order.dueDate).toLocaleDateString()}</>}
                      </p>
                    )}
                  </div>
                  <ChevronRight className="h-4 w-4 flex-shrink-0 text-destructive/60" aria-hidden />
                </Link>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </section>
  );
};
