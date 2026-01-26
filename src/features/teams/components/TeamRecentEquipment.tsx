import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Forklift, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getEquipmentStatusBorderClass } from '@/lib/status-colors';
import type { RecentEquipmentItem } from '@/features/teams/services/teamStatsService';

interface TeamRecentEquipmentProps {
  teamId: string;
  equipment: RecentEquipmentItem[];
  isLoading: boolean;
}

function getEquipmentStatusBadgeVariant(status: string): 'default' | 'destructive' | 'secondary' {
  if (status === 'active') return 'default';
  if (status === 'maintenance') return 'destructive';
  return 'secondary';
}

/**
 * Recent equipment preview component for team details page
 */
const TeamRecentEquipment: React.FC<TeamRecentEquipmentProps> = ({
  teamId,
  equipment,
  isLoading,
}) => {
  // Don't render if no equipment and not loading
  if (!isLoading && equipment.length === 0) {
    return null;
  }

  return (
    <Card className="shadow-elevation-2">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Forklift className="h-5 w-5" />
          Recent Equipment
        </CardTitle>
        <CardDescription>
          Latest equipment added to this team
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
                <Skeleton className="h-5 w-16" />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {equipment.map((item) => {
              const statusBorderClass = getEquipmentStatusBorderClass(item.status);
              return (
                <Link
                  key={item.id}
                  to={`/dashboard/equipment/${item.id}`}
                  className={cn(
                    'flex items-center justify-between rounded-lg p-3 border transition-all duration-fast',
                    'hover:bg-muted/50 hover:shadow-sm',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                    statusBorderClass
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium line-clamp-1">{item.name}</p>
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
              );
            })}
          </div>
        )}
      </CardContent>
      {equipment.length > 0 && (
        <CardFooter className="pt-0">
          <Button asChild variant="secondary" className="w-full">
            <Link
              to={`/dashboard/equipment?team=${teamId}`}
              className="inline-flex items-center justify-center gap-2"
            >
              View all equipment
              <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
        </CardFooter>
      )}
    </Card>
  );
};

export default TeamRecentEquipment;
