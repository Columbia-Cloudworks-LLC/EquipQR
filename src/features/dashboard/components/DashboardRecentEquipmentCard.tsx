import React from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Forklift } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { getStatusDisplayInfo } from "@/features/equipment/utils/equipmentHelpers";
import { cn } from "@/lib/utils";

interface RecentEquipmentItem {
  id: string;
  name: string;
  manufacturer: string;
  model: string;
  status: string;
  created_at?: string;
}

interface DashboardRecentEquipmentCardProps {
  equipment: RecentEquipmentItem[];
  isLoading: boolean;
  hasMore: boolean;
}

export const DashboardRecentEquipmentCard: React.FC<DashboardRecentEquipmentCardProps> = ({
  equipment,
  isLoading,
  hasMore,
}) => {
  return (
    <section aria-labelledby="recent-equipment-heading">
      <Card>
        <CardHeader>
          <CardTitle as="h2" id="recent-equipment-heading" className="flex items-center gap-2 text-base">
            <Forklift className="h-4 w-4" />
            Recent Equipment
          </CardTitle>
          <CardDescription className="opacity-75">Latest equipment in your fleet</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-12 animate-pulse rounded bg-muted" />
              ))}
            </div>
          ) : equipment.length > 0 ? (
            <div className="divide-y divide-border/50">
              {equipment.map((item) => {
                const statusInfo = getStatusDisplayInfo(item.status);
                return (
                  <Link
                    key={item.id}
                    to={`/dashboard/equipment/${item.id}`}
                    className={cn(
                      "flex items-center gap-3 py-2.5 pl-3 pr-2 -mx-3 transition-colors",
                      "hover:bg-muted/60 dark:hover:bg-white/[0.04]",
                      "active:bg-white/5 dark:active:bg-white/[0.03]",
                      "border-l-2 border-transparent",
                      statusInfo.badgeClassName?.includes('green') || item.status === 'active'
                        ? "hover:border-l-success"
                        : item.status === 'maintenance'
                          ? "hover:border-l-warning"
                          : "hover:border-l-muted-foreground",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    )}
                  >
                    <div
                      className={cn(
                        "w-0.5 self-stretch flex-shrink-0 rounded-full",
                        item.status === 'active' ? "bg-success" :
                        item.status === 'maintenance' ? "bg-warning" :
                        item.status === 'retired' || item.status === 'inactive' ? "bg-muted-foreground/40" :
                        "bg-destructive"
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium leading-tight">{item.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {item.manufacturer} {item.model}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn("ml-1 flex-shrink-0 text-xs", statusInfo.badgeClassName)}
                    >
                      {statusInfo.label}
                    </Badge>
                    <ChevronRight className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground/50" aria-hidden />
                  </Link>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-2">No equipment found</p>
          )}
        </CardContent>
        {hasMore && !isLoading && (
          <CardFooter className="pt-0 border-t border-border/50">
            <Link
              to="/dashboard/equipment"
              className="inline-flex items-center gap-1 min-h-[44px] text-sm text-muted-foreground hover:text-foreground active:text-foreground transition-colors touch-manipulation"
            >
              View all equipment
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </CardFooter>
        )}
      </Card>
    </section>
  );
};
