import React from "react";
import { Forklift } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { getStatusDisplayInfo } from "@/features/equipment/utils/equipmentHelpers";
import { cn } from "@/lib/utils";

import { DashboardRecentListCard } from "./DashboardRecentListCard";

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

function equipmentStatusStripeClass(status: string): string {
  if (status === 'active') return 'bg-success';
  if (status === 'maintenance') return 'bg-warning';
  if (status === 'retired' || status === 'inactive') return 'bg-muted-foreground/40';
  return 'bg-destructive';
}

export const DashboardRecentEquipmentCard: React.FC<DashboardRecentEquipmentCardProps> = ({
  equipment,
  isLoading,
  hasMore,
}) => (
  <DashboardRecentListCard
    sectionId="recent-equipment-heading"
    heading="Recent Equipment"
    description="Latest equipment in your fleet"
    icon={Forklift}
    items={equipment}
    isLoading={isLoading}
    hasMore={hasMore}
    viewAllHref="/dashboard/equipment"
    viewAllLabel="View all equipment"
    emptyMessage="No equipment found"
    getItemKey={(item) => item.id}
    getItemHref={(item) => `/dashboard/equipment/${item.id}`}
    renderStatusStripe={(item) => (
      <div
        className={cn(
          'w-0.5 self-stretch flex-shrink-0 rounded-full',
          equipmentStatusStripeClass(item.status)
        )}
      />
    )}
    renderTitle={(item) => item.name}
    renderSubtitle={(item) => `${item.manufacturer} ${item.model}`}
    renderBadge={(item) => {
      const statusInfo = getStatusDisplayInfo(item.status);
      return (
        <Badge
          variant="outline"
          className={cn('ml-1 flex-shrink-0 text-xs', statusInfo.badgeClassName)}
        >
          {statusInfo.label}
        </Badge>
      );
    }}
  />
);
