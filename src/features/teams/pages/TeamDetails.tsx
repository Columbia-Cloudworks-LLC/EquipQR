import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

import { ArrowLeft, Settings, Users, Trash2, Plus, Edit, Forklift, ClipboardList } from 'lucide-react';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useTeam, useTeamMutations } from '@/features/teams/hooks/useTeamManagement';
import { usePermissions } from '@/hooks/usePermissions';
import { useTeamStats } from '@/features/teams/hooks/useTeamStats';
import TeamMembersList from '@/features/teams/components/TeamMembersList';
import TeamMetadataEditor from '@/features/teams/components/TeamMetadataEditor';
import AddTeamMemberDialog from '@/features/teams/components/AddTeamMemberDialog';
import { QuickBooksCustomerMapping } from '@/features/teams/components/QuickBooksCustomerMapping';
import TeamQuickActions from '@/features/teams/components/TeamQuickActions';
import TeamActivitySummary from '@/features/teams/components/TeamActivitySummary';
import TeamRecentEquipment from '@/features/teams/components/TeamRecentEquipment';
import TeamRecentWorkOrders from '@/features/teams/components/TeamRecentWorkOrders';
import TeamLocationCard from '@/features/teams/components/TeamLocationCard';

const TeamDetails = () => {
  const { teamId } = useParams<{ teamId: string }>();
  const navigate = useNavigate();
  const { currentOrganization, isLoading } = useOrganization();
  const [showMetadataEditor, setShowMetadataEditor] = useState(false);
  const [showAddMemberDialog, setShowAddMemberDialog] = useState(false);

  // Use team hook for data
  const { data: team, isLoading: teamLoading } = useTeam(teamId);
  const { deleteTeam } = useTeamMutations();
  const permissions = usePermissions();
  
  // Fetch team statistics (equipment, work orders, recent items)
  const {
    equipmentStats,
    workOrderStats,
    recentEquipment,
    recentWorkOrders,
    isLoadingEquipmentStats,
    isLoadingWorkOrderStats,
    isLoadingRecentEquipment,
    isLoadingRecentWorkOrders,
  } = useTeamStats(teamId, currentOrganization?.id);

  if (isLoading || teamLoading || !currentOrganization || !teamId) {
    return (
      <div className="container mx-auto py-6 px-4 sm:px-6 space-y-6">
        <div className="h-8 bg-muted animate-pulse rounded" />
        <div className="grid gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="h-48 bg-muted animate-pulse rounded" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="container mx-auto py-6 px-4 sm:px-6 space-y-6">
        <Button
          variant="ghost"
          onClick={() => navigate('/dashboard/teams')}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Teams
        </Button>
        <Card>
          <CardContent className="text-center py-12">
            <h3 className="text-lg font-semibold mb-2">Team not found</h3>
            <p className="text-muted-foreground mb-4">
              The team you're looking for doesn't exist or you don't have permission to view it.
            </p>
            <Button onClick={() => navigate('/dashboard/teams')}>
              Return to Teams
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Permissions
  const canEdit = permissions.canManageTeam(team.id);
  const canDelete = permissions.canManageTeam(team.id);
  const canManageMembers = permissions.canManageTeam(team.id);

  const handleDeleteTeam = async () => {
    if (!team) return;
    
    const confirmed = window.confirm(`Are you sure you want to delete "${team.name}"? This action cannot be undone.`);
    if (!confirmed) return;

    try {
      await deleteTeam.mutateAsync(team.id);
      navigate('/dashboard/teams');
    } catch {
      // Error is handled by the mutation
    }
  };

  return (
    <div className="container mx-auto py-6 px-4 sm:px-6 space-y-6">
      {/* Header - Mobile: stacked, Desktop: horizontal */}
      <header className="space-y-4">
        {/* Top row: Back button + Actions */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/dashboard/teams')}
            className="text-muted-foreground hover:text-foreground -ml-2"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">Back to Teams</span>
            <span className="sm:hidden">Back</span>
          </Button>
          
          <div className="flex items-center gap-1 sm:gap-2">
            {canEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowMetadataEditor(true)}
                className="gap-1.5"
              >
                <Edit className="h-4 w-4" />
                <span className="hidden sm:inline">Edit Team</span>
              </Button>
            )}
            {canDelete && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleDeleteTeam}
                className="text-destructive hover:text-destructive gap-1.5"
              >
                <Trash2 className="h-4 w-4" />
                <span className="hidden md:inline">Delete Team</span>
              </Button>
            )}
          </div>
        </div>
        
        {/* Team title - centered on mobile, left-aligned on desktop */}
        <div className="text-center sm:text-left">
          <div className="inline-flex items-center gap-3 mb-1">
            {team.image_url ? (
              <img
                src={team.image_url}
                alt={team.name}
                className="h-12 w-12 sm:h-14 sm:w-14 rounded-xl object-cover"
              />
            ) : (
              <div className="p-2 rounded-xl bg-primary/10">
                <Users className="h-6 w-6 sm:h-7 sm:w-7 text-primary" />
              </div>
            )}
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              {team.name}
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">
            {team.member_count} {team.member_count === 1 ? 'member' : 'members'}
          </p>
        </div>
      </header>

      {/* Team Overview */}
      <Card className="shadow-elevation-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Team Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="text-sm font-medium text-muted-foreground">Description</h4>
            <p className="text-sm">{team.description || 'No description provided'}</p>
          </div>
          
          {/* Stats grid - responsive: 2 cols on mobile, 3 on tablet, 5 on desktop */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
            <div className="p-3 rounded-lg bg-muted/30">
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Members</h4>
              <p className="text-xl sm:text-2xl font-bold text-primary mt-1">{team.members.length}</p>
            </div>
            <Link 
              to={`/dashboard/equipment?team=${team.id}`}
              className="p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors group"
            >
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1 group-hover:text-primary transition-colors">
                <Forklift className="h-3 w-3" />
                Equipment
              </h4>
              {isLoadingEquipmentStats ? (
                <Skeleton className="h-7 w-10 mt-1" />
              ) : (
                <p className="text-xl sm:text-2xl font-bold text-primary mt-1">{equipmentStats?.totalEquipment ?? 0}</p>
              )}
            </Link>
            <Link 
              to={`/dashboard/work-orders?team=${team.id}`}
              className="p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors group"
            >
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1 group-hover:text-primary transition-colors">
                <ClipboardList className="h-3 w-3" />
                Work Orders
              </h4>
              {isLoadingWorkOrderStats ? (
                <Skeleton className="h-7 w-10 mt-1" />
              ) : (
                <p className="text-xl sm:text-2xl font-bold text-primary mt-1">{workOrderStats?.activeWorkOrders ?? 0}</p>
              )}
            </Link>
            <div className="p-3 rounded-lg bg-muted/30">
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Created</h4>
              <p className="text-sm text-foreground mt-1">
                {new Date(team.created_at).toLocaleDateString()}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-muted/30">
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</h4>
              <Badge className="bg-success/20 text-success border-success/30 mt-1">
                Active
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Team Location */}
      <TeamLocationCard
        team={team}
        canEdit={canEdit}
        onEditClick={() => setShowMetadataEditor(true)}
      />

      {/* Quick Actions */}
      <TeamQuickActions teamId={team.id} teamName={team.name} />

      {/* Team Activity Summary */}
      <TeamActivitySummary
        teamId={team.id}
        equipmentStats={equipmentStats}
        workOrderStats={workOrderStats}
        isLoading={isLoadingEquipmentStats || isLoadingWorkOrderStats}
      />

      {/* Recent Equipment - Only show if has equipment or loading */}
      <TeamRecentEquipment
        teamId={team.id}
        equipment={recentEquipment}
        isLoading={isLoadingRecentEquipment}
      />

      {/* Recent Work Orders - Only show if has work orders or loading */}
      <TeamRecentWorkOrders
        teamId={team.id}
        workOrders={recentWorkOrders}
        isLoading={isLoadingRecentWorkOrders}
      />

      {/* QuickBooks Customer Mapping */}
      <QuickBooksCustomerMapping teamId={team.id} teamName={team.name} />

      {/* Team Members */}
      <Card className="shadow-elevation-2">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Team Members
              </CardTitle>
              <CardDescription>
                Manage team members and their roles
              </CardDescription>
            </div>
            {canManageMembers && (
              <Button
                onClick={() => setShowAddMemberDialog(true)}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Member
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <TeamMembersList team={team} />
        </CardContent>
      </Card>

      {/* Dialogs */}
      <TeamMetadataEditor
        open={showMetadataEditor}
        onClose={() => setShowMetadataEditor(false)}
        team={team}
      />

      <AddTeamMemberDialog
        open={showAddMemberDialog}
        onClose={() => setShowAddMemberDialog(false)}
        team={team}
      />
    </div>
  );
};

export default TeamDetails;
