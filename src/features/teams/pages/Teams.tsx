import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Plus, Search, Settings, UserCheck, Eye, Wrench, Forklift, ClipboardList, AlertTriangle, ArrowUpDown, MoreVertical, Building2, Link2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useTeams } from '@/features/teams/hooks/useTeams';
import { useTeamsListStats } from '@/features/teams/hooks/useTeamsListStats';
import { usePermissions } from '@/hooks/usePermissions';
import { useNavigate } from 'react-router-dom';
import CreateTeamDialog from '@/features/teams/components/CreateTeamDialog';

const Teams = () => {
  const navigate = useNavigate();
  const { currentOrganization } = useOrganization();
  const { teams = [], isLoading } = useTeams();
  const { canCreateTeam } = usePermissions();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name-asc' | 'name-desc' | 'members' | 'newest'>('name-asc');
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const teamIds = teams.map(t => t.id);
  const { data: listStats } = useTeamsListStats(currentOrganization?.id, teamIds);

  const canCreateTeams = canCreateTeam();

  const handleTeamCardKeyDown = (event: React.KeyboardEvent<HTMLElement>, teamId: string) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      navigate(`/dashboard/teams/${teamId}`);
    }
  };

  const filteredTeams = teams
    .filter(team =>
      team.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      team.description?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      switch (sortBy) {
        case 'name-asc':
          return a.name.localeCompare(b.name);
        case 'name-desc':
          return b.name.localeCompare(a.name);
        case 'members':
          return b.member_count - a.member_count;
        case 'newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        default:
          return 0;
      }
    });

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
        return 'bg-info/20 text-info border-info/30';
      case 'technician':
        return 'bg-success/20 text-success border-success/30';
      case 'requestor':
        return 'bg-warning/20 text-warning border-warning/30';
      case 'viewer':
        return 'bg-muted text-foreground border-border';
      default:
        return 'bg-muted text-foreground border-border';
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
                <div className="h-4 bg-muted/80 rounded w-3/4"></div>
                <div className="h-3 bg-muted/80 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-3 bg-muted/80 rounded"></div>
                  <div className="h-3 bg-muted/80 rounded w-2/3"></div>
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
      <div>
        <h1 className="text-3xl font-bold">Teams</h1>
        <p className="text-muted-foreground mt-1">
          Manage your organization's teams and members
        </p>
      </div>

      {/* Search + Sort + Create toolbar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search teams..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            aria-label="Search teams by name or description"
          />
        </div>
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
          <SelectTrigger className="w-[160px] shrink-0">
            <ArrowUpDown className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name-asc">Name A–Z</SelectItem>
            <SelectItem value="name-desc">Name Z–A</SelectItem>
            <SelectItem value="members">Most Members</SelectItem>
            <SelectItem value="newest">Newest First</SelectItem>
          </SelectContent>
        </Select>
        {canCreateTeams && (
          <Button onClick={() => setShowCreateDialog(true)} className="gap-2 shrink-0">
            <Plus className="h-4 w-4" />
            Create Team
          </Button>
        )}
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
            <Card 
              key={team.id} 
              className="hover:shadow-md transition-shadow cursor-pointer group"
              onClick={() => navigate(`/dashboard/teams/${team.id}`)}
              onKeyDown={(event) => handleTeamCardKeyDown(event, team.id)}
              role="button"
              tabIndex={0}
              aria-label={`Open team details for ${team.name}`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg group-hover:text-primary transition-colors truncate">
                        {team.name}
                      </CardTitle>
                      {team.customer_status ? (
                        <Badge
                          variant="outline"
                          className={`text-xs shrink-0 ${
                            team.customer_status === 'active'
                              ? 'bg-success/20 text-success border-success/30'
                              : team.customer_status === 'prospect'
                                ? 'bg-info/20 text-info border-info/30'
                                : 'bg-muted text-muted-foreground border-border'
                          }`}
                        >
                          {team.customer_status.charAt(0).toUpperCase() + team.customer_status.slice(1)}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-success/20 text-success border-success/30 text-xs shrink-0">
                          Active
                        </Badge>
                      )}
                      {team.quickbooks_synced_at && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Link2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            </TooltipTrigger>
                            <TooltipContent>
                              QB synced {new Date(team.quickbooks_synced_at).toLocaleDateString()}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                    {team.customer_name && (
                      <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1 truncate">
                        <Building2 className="h-3 w-3 shrink-0" />
                        {team.customer_name}
                      </p>
                    )}
                    <CardDescription className="mt-1 line-clamp-2">
                      {team.description || 'No description provided'}
                    </CardDescription>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreVertical className="h-4 w-4" />
                        <span className="sr-only">Actions for {team.name}</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/dashboard/teams/${team.id}`);
                        }}
                      >
                        <Settings className="h-4 w-4 mr-2" />
                        View Team Details
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/dashboard/equipment?team=${team.id}`);
                        }}
                      >
                        <Forklift className="h-4 w-4 mr-2" />
                        View Equipment
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/dashboard/work-orders?team=${team.id}`);
                        }}
                      >
                        <ClipboardList className="h-4 w-4 mr-2" />
                        View Work Orders
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Stats row */}
                {(() => {
                  const stats = listStats?.[team.id];
                  return (
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" />
                        {team.member_count}
                      </span>
                      <span className="flex items-center gap-1">
                        <Forklift className="h-3.5 w-3.5" />
                        {stats?.equipmentCount ?? '—'}
                      </span>
                      <span className="flex items-center gap-1">
                        <ClipboardList className="h-3.5 w-3.5" />
                        {stats?.activeWOs ?? '—'}
                      </span>
                      {(stats?.overdueWOs ?? 0) > 0 && (
                        <span className="flex items-center gap-1 text-warning font-medium">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          {stats!.overdueWOs} overdue
                        </span>
                      )}
                    </div>
                  );
                })()}

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

