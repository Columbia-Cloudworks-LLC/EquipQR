/**
 * DangerZoneSection - Container for dangerous organization operations
 * 
 * Provides access to:
 * - Transfer Ownership (owner only)
 * - Leave Organization (non-owners)
 * - Delete Organization (owner only)
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  AlertTriangle, 
  UserMinus, 
  Trash2, 
  ArrowRightLeft,
  Shield
} from 'lucide-react';
import { TransferOwnershipDialog } from './TransferOwnershipDialog';
import { LeaveOrganizationDialog } from './LeaveOrganizationDialog';
import { DeleteOrganizationDialog } from './DeleteOrganizationDialog';
import { PendingTransferCard } from './PendingTransferCard';
import { usePendingTransferForUser } from '@/features/organization/hooks/useOwnershipTransfer';
import type { SimpleOrganization } from '@/contexts/SimpleOrganizationContext';

interface DangerZoneSectionProps {
  organization: SimpleOrganization;
  currentUserRole: 'owner' | 'admin' | 'member';
  admins: Array<{ id: string; userId: string; name: string; email: string }>;
}

export const DangerZoneSection: React.FC<DangerZoneSectionProps> = ({
  organization,
  currentUserRole,
  admins,
}) => {
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const isOwner = currentUserRole === 'owner';
  
  // Check for pending transfer requests for the current user
  const { data: pendingTransfer, isLoading: transferLoading } = usePendingTransferForUser();

  // Filter admins for transfer (exclude current owner)
  const transferableAdmins = admins.filter(admin => admin.userId !== organization.id);

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex items-center gap-2 text-destructive">
        <AlertTriangle className="h-5 w-5" />
        <h3 className="text-lg font-semibold">Danger Zone</h3>
      </div>

      {/* Pending Transfer Alert */}
      {!transferLoading && pendingTransfer && pendingTransfer.is_incoming && (
        <PendingTransferCard transfer={pendingTransfer} />
      )}

      {/* Outgoing Transfer Alert */}
      {!transferLoading && pendingTransfer && !pendingTransfer.is_incoming && isOwner && (
        <Alert className="border-yellow-500/50 bg-yellow-500/10">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-700 dark:text-yellow-400">
            You have a pending ownership transfer request to{' '}
            <strong>{pendingTransfer.to_user_name}</strong>. 
            Waiting for their response.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4">
        {/* Transfer Ownership - Owner Only */}
        {isOwner && (
          <Card className="border-destructive/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <ArrowRightLeft className="h-4 w-4" />
                Transfer Ownership
              </CardTitle>
              <CardDescription>
                Transfer ownership of this organization to another admin. 
                A new personal organization will be created for you.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {transferableAdmins.length === 0 ? (
                <Alert>
                  <Shield className="h-4 w-4" />
                  <AlertDescription>
                    You need at least one admin in your organization before you can transfer ownership.
                    Invite someone and promote them to admin first.
                  </AlertDescription>
                </Alert>
              ) : (
                <Button
                  variant="outline"
                  className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                  onClick={() => setShowTransferDialog(true)}
                  disabled={!!pendingTransfer}
                >
                  <ArrowRightLeft className="h-4 w-4 mr-2" />
                  Transfer Ownership
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Leave Organization - Non-owners Only */}
        {!isOwner && (
          <Card className="border-destructive/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <UserMinus className="h-4 w-4" />
                Leave Organization
              </CardTitle>
              <CardDescription>
                Leave this organization. You will lose access to all organization data.
                This action cannot be undone.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                onClick={() => setShowLeaveDialog(true)}
              >
                <UserMinus className="h-4 w-4 mr-2" />
                Leave Organization
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Delete Organization - Owner Only */}
        {isOwner && (
          <Card className="border-destructive">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2 text-destructive">
                <Trash2 className="h-4 w-4" />
                Delete Organization
              </CardTitle>
              <CardDescription>
                Permanently delete this organization and all its data.
                This includes all equipment, work orders, teams, and inventory.
                <strong className="block mt-1 text-destructive">
                  This action is irreversible.
                </strong>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="destructive"
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Organization
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Dialogs */}
      <TransferOwnershipDialog
        open={showTransferDialog}
        onOpenChange={setShowTransferDialog}
        organization={organization}
        admins={transferableAdmins}
      />

      <LeaveOrganizationDialog
        open={showLeaveDialog}
        onOpenChange={setShowLeaveDialog}
        organization={organization}
      />

      <DeleteOrganizationDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        organization={organization}
      />
    </div>
  );
};

export default DangerZoneSection;
