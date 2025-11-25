import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Users, Plus, Search, Settings, UserCheck, Eye, Wrench } from 'lucide-react';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useTeams } from '@/hooks/useTeams';
import { usePermissions } from '@/hooks/usePermissions';
import { useNavigate } from 'react-router-dom';
import CreateTeamDialog from '@/components/teams/CreateTeamDialog';

const Teams = () => {
  const navigate = useNavigate();
  const { currentOrganization } = useOrganization();
  const { teams = [], isLoading } = useTeams();
  const { canCreateTeam } = usePermissions();
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const canCreateTeams = canCreateTeam();

  // Filter teams based on search term
  const filteredTeams = teams.filter(team =>
    team.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    team.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'manager':
        return <Settings className="h-3 w-3" />;
      case 'technician':
        return <Wrench className="h-3 w-3" />;
      case 'requestor':
        return <UserCheck className="h-3 w-3" />;
      case 'viewer':
        return <Eye className="h-3 w-3" />;
      default:
        return <UserCheck className="h-3 w-3" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'manager':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'technician':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'requestor':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'viewer':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (isLoading) {
    return (
      <div data-testid="teams-loading" className="container mx-auto py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Teams</h1>
            <p className="text-muted-foreground mt-1">
              Manage your organization's teams and members
            </p>
          </div>
        </div>
        
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-3 bg-gray-200 rounded"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Teams</h1>
          <p className="text-muted-foreground mt-1">
            Manage your organization's teams and members
          </p>
        </div>
        {canCreateTeams && (
          <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Create Team
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search teams..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Teams Grid */}
      {filteredTeams.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            {searchTerm ? (
              <>
                <h3 className="text-lg font-semibold mb-2">No teams found</h3>
                <p className="text-muted-foreground">
                  No teams match your search criteria. Try a different search term.
                </p>
              </>
            ) : (
              <>
                <h3 className="text-lg font-semibold mb-2">No teams yet</h3>
                <p className="text-muted-foreground mb-4">
                  {canCreateTeams
                    ? "Get started by creating your first team to organize your maintenance work."
                    : "No teams have been created yet. Contact your administrator to create teams."
                  }
                </p>
                {canCreateTeams && (
                  <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Create First Team
                  </Button>
                )}
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredTeams.map((team) => (
            <Card key={team.id} className="hover:shadow-md transition-shadow cursor-pointer group">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg group-hover:text-primary transition-colors truncate">
                      {team.name}
                    </CardTitle>
                    <CardDescription className="mt-1 line-clamp-2">
                      {team.description || 'No description provided'}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Member Count */}
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{team.member_count} members</span>
                  </div>
                </div>

                {/* Member Preview */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium">Team Members</h4>
                  <div className="space-y-2">
                    {team.members.slice(0, 3).map((member) => {
                      const memberName = member.profiles?.name || 'Unknown User';
                      const memberEmail = member.profiles?.email || 'No email';
                      
                      return (
                        <div key={member.id} className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-xs bg-muted">
                              {memberName.split(' ').map(n => n[0]).join('').toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{memberName}</p>
                            <p className="text-xs text-muted-foreground truncate">{memberEmail}</p>
                          </div>
                          <Badge variant="outline" className={`${getRoleColor(member.role)} text-xs`}>
                            <div className="flex items-center gap-1">
                              {getRoleIcon(member.role)}
                              {member.role}
                            </div>
                          </Badge>
                        </div>
                      );
                    })}
                    {team.members.length > 3 && (
                      <p className="text-xs text-muted-foreground text-center">
                        +{team.members.length - 3} more members
                      </p>
                    )}
                    {team.members.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-2">
                        No members yet
                      </p>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-2 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/dashboard/teams/${team.id}`)}
                    className="w-full"
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Manage Team
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <CreateTeamDialog 
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        organizationId={currentOrganization?.id || ''}
      />
    </div>
  );
};

export default Teams;
