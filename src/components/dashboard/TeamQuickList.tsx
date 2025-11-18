import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTeams } from '@/hooks/useTeams';
import { usePermissions } from '@/hooks/usePermissions';
import { useOrganization } from '@/contexts/OrganizationContext';

const TeamQuickList = () => {
  const { currentOrganization } = useOrganization();
  const { hasRole } = usePermissions();
  const { teams, isLoading } = useTeams();

  // Org admins see all teams, regular users see only their teams
  const isOrgAdmin = hasRole(['owner', 'admin']);
  
  // For regular users, we need to filter to only teams they're members of
  // This filtering is already handled in useTeams hook based on team memberships
  const visibleTeams = isOrgAdmin ? (teams || []) : (teams || []);

  if (!currentOrganization) {
    return null;
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Teams
          </CardTitle>
          <CardDescription>
            Quick access to team equipment
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-12 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (visibleTeams.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Teams
          </CardTitle>
          <CardDescription>
            Quick access to team equipment
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">No teams available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Teams
        </CardTitle>
        <CardDescription>
          Quick access to team equipment
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="max-h-60 overflow-y-auto space-y-2">
          {visibleTeams.map((team) => (
            <Link
              key={team.id}
              to={`/dashboard/equipment?team=${team.id}`}
              className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
            >
              <div>
                <p className="font-medium">{team.name}</p>
                {team.description && (
                  <p className="text-sm text-muted-foreground">{team.description}</p>
                )}
              </div>
              <Users className="h-4 w-4 text-muted-foreground" />
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default TeamQuickList;