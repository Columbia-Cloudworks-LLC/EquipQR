import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Users } from 'lucide-react';
import { TeamFleetOption } from '@/services/teamFleetService';

interface TeamSelectorProps {
  teams: TeamFleetOption[];
  selectedTeamId: string | null;
  onTeamChange: (teamId: string | null) => void;
  isLoading?: boolean;
}

export const TeamSelector: React.FC<TeamSelectorProps> = ({
  teams,
  selectedTeamId,
  onTeamChange,
  isLoading = false
}) => {
  // Filter teams that have equipment with location data
  const teamsWithLocationData = teams.filter(team => team.hasLocationData);
  const totalEquipmentCount = teams.reduce((sum, team) => sum + team.equipmentCount, 0);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Select Team Fleet
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-10 bg-muted animate-pulse rounded" />
        </CardContent>
      </Card>
    );
  }

  if (teamsWithLocationData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Team Fleet
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No teams with location data found
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-4 w-4" />
          Select Team Fleet
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Select
          value={selectedTeamId || ''}
          onValueChange={(value) => onTeamChange(value === 'all' ? 'all' : value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Choose team to view..." />
          </SelectTrigger>
          <SelectContent>
            {teamsWithLocationData.map((team) => (
              <SelectItem key={team.id} value={team.id}>
                <div className="flex items-center justify-between w-full">
                  <span>{team.name}</span>
                  <Badge variant="secondary" className="ml-2">
                    {team.equipmentCount} equipment
                  </Badge>
                </div>
              </SelectItem>
            ))}
            {teamsWithLocationData.length > 1 && (
              <SelectItem value="all">
                <div className="flex items-center justify-between w-full">
                  <span>All Teams</span>
                  <Badge variant="outline" className="ml-2">
                    {totalEquipmentCount} equipment
                  </Badge>
                </div>
              </SelectItem>
            )}
          </SelectContent>
        </Select>
        
        {selectedTeamId && selectedTeamId !== 'all' && (
          <div className="text-xs text-muted-foreground">
            Showing equipment from selected team only
          </div>
        )}
        
        {selectedTeamId === 'all' && (
          <div className="text-xs text-muted-foreground">
            Showing equipment from all accessible teams
          </div>
        )}
      </CardContent>
    </Card>
  );
};
