
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import { ArrowLeft, Settings, Users, Trash2, Plus, Edit } from 'lucide-react';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useTeam, useTeamMutations } from '@/features/teams/hooks/useTeamManagement';
import { usePermissions } from '@/hooks/usePermissions';
import TeamMembersList from '@/features/teams/components/TeamMembersList';
import TeamMetadataEditor from '@/features/teams/components/TeamMetadataEditor';
import AddTeamMemberDialog from '@/features/teams/components/AddTeamMemberDialog';
import { QuickBooksCustomerMapping } from '@/features/teams/components/QuickBooksCustomerMapping';

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

  if (isLoading || teamLoading || !currentOrganization || !teamId) {
    return (
      <div className="space-y-6">
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
      <div className="space-y-6">
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => navigate('/dashboard/teams')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Teams
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <Users className="h-8 w-8 text-blue-600" />
              {team.name}
            </h1>
            <p className="text-muted-foreground">
              {team.member_count} members
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canEdit && (
            <Button
              variant="outline"
              onClick={() => setShowMetadataEditor(true)}
              className="flex items-center gap-2"
            >
              <Edit className="h-4 w-4" />
              Edit Team
            </Button>
          )}
          {canDelete && (
            <Button
              variant="outline"
              onClick={handleDeleteTeam}
              className="flex items-center gap-2 text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
              Delete Team
            </Button>
          )}
        </div>
      </div>

      {/* Team Overview */}
      <Card>
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
          
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <h4 className="text-sm font-medium text-muted-foreground">Total Members</h4>
              <p className="text-2xl font-bold text-blue-600">{team.members.length}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-muted-foreground">Team Created</h4>
              <p className="text-sm text-muted-foreground">
                {new Date(team.created_at).toLocaleDateString()}
              </p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-muted-foreground">Team Status</h4>
              <Badge className="bg-green-100 text-green-800 border-green-200">
                Active
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* QuickBooks Customer Mapping */}
      <QuickBooksCustomerMapping teamId={team.id} teamName={team.name} />

      {/* Team Members */}
      <Card>
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
