import React from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Forklift } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

interface RecentEquipmentItem {
  id: string;
  name: string;
  manufacturer: string;
  model: string;
  status: string;
}

interface DashboardRecentEquipmentCardProps {
  equipment: RecentEquipmentItem[];
  isLoading: boolean;
  hasMore: boolean;
}

function getEquipmentStatusBadgeVariant(status: string): "default" | "destructive" | "secondary" {
  if (status === "active") return "default";
  if (status === "maintenance") return "destructive";
  return "secondary";
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
          <CardTitle as="h2" id="recent-equipment-heading" className="flex items-center gap-2">
            <Forklift className="h-5 w-5" />
            Recent Equipment
          </CardTitle>
          <CardDescription>Latest equipment in your fleet</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 animate-pulse rounded bg-muted" />
              ))}
            </div>
          ) : equipment.length > 0 ? (
            <div className="space-y-4">
              {equipment.map((item) => (
                <Link
                  key={item.id}
                  to={`/dashboard/equipment/${item.id}`}
                  className="flex items-center justify-between rounded-lg p-2 -m-2 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 font-medium">{item.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {item.manufacturer} {item.model}
                    </p>
                  </div>
                  <Badge
                    variant={getEquipmentStatusBadgeVariant(item.status)}
                    className="ml-2 flex-shrink-0"
                  >
                    {item.status}
                  </Badge>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">No equipment found</p>
          )}
        </CardContent>
        {hasMore && !isLoading && (
          <CardFooter>
            <Button asChild variant="secondary" className="w-full">
              <Link to="/dashboard/equipment" className="inline-flex items-center justify-center gap-2">
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

