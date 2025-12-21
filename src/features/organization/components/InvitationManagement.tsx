
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { UserPlus, MoreHorizontal, Mail, Clock, CheckCircle, XCircle } from 'lucide-react';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useOrganizationInvitations, useResendInvitation, useCancelInvitation } from '@/hooks/useOrganizationInvitations';
import { SimplifiedInvitationDialog } from './SimplifiedInvitationDialog';
import { formatDistanceToNow } from 'date-fns';

const InvitationManagement = () => {
  const { currentOrganization } = useOrganization();
  const currentOrg = currentOrganization;
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  
  const { data: invitations = [], isLoading } = useOrganizationInvitations(currentOrg?.id || '');
  const resendInvitation = useResendInvitation(currentOrg?.id || '');
  const cancelInvitation = useCancelInvitation(currentOrg?.id || '');

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'accepted':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'declined':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'expired':
        return <XCircle className="h-4 w-4 text-gray-500" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'accepted':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'declined':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'expired':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handleResendInvitation = async (invitationId: string) => {
    try {
      await resendInvitation.mutateAsync(invitationId);
    } catch (error) {
      console.error('Failed to resend invitation:', error);
    }
  };

  const handleCancelInvitation = async (invitationId: string) => {
    try {
      await cancelInvitation.mutateAsync(invitationId);
    } catch (error) {
      console.error('Failed to cancel invitation:', error);
    }
  };

  const canManageInvitations = currentOrg && ['owner', 'admin'].includes(currentOrg.userRole);

  if (!currentOrg) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Pending Invitations
          </CardTitle>
          {canManageInvitations && (
            <Button onClick={() => setInviteDialogOpen(true)} size="sm">
              <UserPlus className="mr-2 h-4 w-4" />
              Invite Member
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-sm text-muted-foreground">Loading invitations...</div>
          </div>
        ) : invitations.length === 0 ? (
          <div className="text-center py-8">
            <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No pending invitations</h3>
            <p className="text-muted-foreground">
              {canManageInvitations 
                ? "Send invitations to add new members to your organization."
                : "No pending invitations at this time."
              }
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Invited By</TableHead>
                <TableHead>Expires</TableHead>
                {canManageInvitations && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {invitations.map((invitation) => (
                <TableRow key={invitation.id}>
                  <TableCell className="font-medium">{invitation.email}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {invitation.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(invitation.status)} variant="outline">
                      <div className="flex items-center gap-1">
                        {getStatusIcon(invitation.status)}
                        {invitation.status}
                      </div>
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {invitation.inviterName}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {invitation.status === 'pending' 
                      ? formatDistanceToNow(new Date(invitation.expiresAt), { addSuffix: true })
                      : invitation.acceptedAt 
                        ? formatDistanceToNow(new Date(invitation.acceptedAt), { addSuffix: true })
                        : '-'
                    }
                  </TableCell>
                  {canManageInvitations && (
                    <TableCell className="text-right">
                      {invitation.status === 'pending' && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => handleResendInvitation(invitation.id)}
                              disabled={resendInvitation.isPending}
                            >
                              <Mail className="h-4 w-4 mr-2" />
                              Resend Invitation
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleCancelInvitation(invitation.id)}
                              disabled={cancelInvitation.isPending}
                              className="text-destructive"
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              Cancel Invitation
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <SimplifiedInvitationDialog
          open={inviteDialogOpen}
          onOpenChange={setInviteDialogOpen}
        />
      </CardContent>
    </Card>
  );
};

export default InvitationManagement;

