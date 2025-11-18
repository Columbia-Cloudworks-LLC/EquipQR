
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Mail, Clock, CheckCircle, XCircle, AlertTriangle, ShoppingCart, CreditCard } from 'lucide-react';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useOrganizationInvitations, useResendInvitation, useCancelInvitation } from '@/hooks/useOrganizationInvitations';
import { useSlotAvailability, useReleaseSlot } from '@/hooks/useOrganizationSlots';
import { shouldBlockInvitation } from '@/utils/billing';
import { formatDistanceToNow } from 'date-fns';

interface EnhancedInvitationManagementProps {
  onPurchaseSlots: (quantity: number) => void;
}

const EnhancedInvitationManagement: React.FC<EnhancedInvitationManagementProps> = ({ onPurchaseSlots }) => {
  const { currentOrganization } = useOrganization();
  const currentOrg = currentOrganization;
  
  const { data: invitations = [], isLoading } = useOrganizationInvitations(currentOrg?.id || '');
  const { data: slotAvailability } = useSlotAvailability(currentOrg?.id || '');
  const resendInvitation = useResendInvitation(currentOrg?.id || '');
  const cancelInvitation = useCancelInvitation(currentOrg?.id || '');
  const releaseSlot = useReleaseSlot(currentOrg?.id || '');

  const blockedBySlots = slotAvailability ? shouldBlockInvitation(slotAvailability) : false;

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
      // Release the slot if it was reserved
      await releaseSlot.mutateAsync(invitationId);
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
            Team Invitations
            {slotAvailability && (
              <Badge variant="outline">
                {slotAvailability.available_slots} slots available
              </Badge>
            )}
          </CardTitle>
          {blockedBySlots && (
            <div className="flex gap-2">
              <Button onClick={() => onPurchaseSlots(5)} size="sm" variant="outline">
                <ShoppingCart className="mr-2 h-4 w-4" />
                Buy Slots
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {blockedBySlots && (
          <Alert className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>No available slots for new invitations.</span>
              <Button 
                onClick={() => onPurchaseSlots(10)} 
                size="sm" 
                className="ml-4"
              >
                <CreditCard className="mr-2 h-4 w-4" />
                Purchase Slots
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-sm text-muted-foreground">Loading invitations...</div>
          </div>
        ) : invitations.length === 0 ? (
          <div className="text-center py-8">
            <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No invitations sent</h3>
            <p className="text-muted-foreground mb-4">
              {canManageInvitations 
                ? "Use the 'Invite Member' button on the Members tab to send invitations."
                : "No invitations have been sent yet."
              }
            </p>
            {blockedBySlots && canManageInvitations && (
              <Button onClick={() => onPurchaseSlots(10)} size="lg">
                <ShoppingCart className="mr-2 h-4 w-4" />
                Purchase Slots to Start Inviting
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden sm:table-cell">Slot Reserved</TableHead>
                  <TableHead className="hidden md:table-cell">Invited By</TableHead>
                  <TableHead className="hidden lg:table-cell">Expires</TableHead>
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
                    <TableCell className="hidden sm:table-cell">
                      <Badge variant={invitation.slot_reserved ? 'default' : 'secondary'}>
                        {invitation.slot_reserved ? 'Yes' : 'No'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground hidden md:table-cell">
                      {invitation.inviterName}
                    </TableCell>
                    <TableCell className="text-muted-foreground hidden lg:table-cell">
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
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default EnhancedInvitationManagement;
