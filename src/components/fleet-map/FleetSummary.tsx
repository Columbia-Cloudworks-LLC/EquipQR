import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin } from 'lucide-react';
import { TeamFleetOption, EquipmentLocation } from '@/services/teamFleetService';

interface FleetSummaryProps {
  selectedTeam: TeamFleetOption | null;
  selectedTeamId: string | null;
  equipmentLocations: EquipmentLocation[];
  totalEquipmentCount: number;
  totalLocatedCount: number;
  isLoading?: boolean;
}

export const FleetSummary: React.FC<FleetSummaryProps> = ({
  selectedTeam,
  selectedTeamId,
  equipmentLocations,
  totalEquipmentCount,
  totalLocatedCount,
  isLoading = false
}) => {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Fleet Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="h-4 bg-muted animate-pulse rounded" />
          <div className="h-4 bg-muted animate-pulse rounded" />
          <div className="h-4 bg-muted animate-pulse rounded" />
        </CardContent>
      </Card>
    );
  }

  const isAllTeams = selectedTeamId === 'all';
  const displayedEquipmentCount = isAllTeams ? totalEquipmentCount : (selectedTeam?.equipmentCount || 0);
  const displayedLocatedCount = equipmentLocations.length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          Fleet Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex justify-between">
          <span className="text-sm">Selected Team:</span>
          <Badge variant="secondary">
            {isAllTeams ? 'All Teams' : (selectedTeam?.name || 'None')}
          </Badge>
        </div>
        
        <div className="flex justify-between">
          <span className="text-sm">Total Equipment:</span>
          <Badge variant="secondary">{displayedEquipmentCount}</Badge>
        </div>
        
        <div className="flex justify-between">
          <span className="text-sm">With Location:</span>
          <Badge variant={displayedLocatedCount > 0 ? "default" : "destructive"}>
            {displayedLocatedCount}
          </Badge>
        </div>
        
        {displayedEquipmentCount > 0 && (
          <div className="flex justify-between">
            <span className="text-sm">Location Coverage:</span>
            <Badge variant={displayedLocatedCount / displayedEquipmentCount >= 0.2 ? "default" : "destructive"}>
              {Math.round((displayedLocatedCount / displayedEquipmentCount) * 100)}%
            </Badge>
          </div>
        )}
        
        {displayedLocatedCount > 0 && (
          <div className="pt-2 border-t">
            <div className="text-xs text-muted-foreground">
              {isAllTeams 
                ? `Showing ${displayedLocatedCount} equipment items from all accessible teams`
                : `Showing ${displayedLocatedCount} equipment items from ${selectedTeam?.name}`
              }
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
