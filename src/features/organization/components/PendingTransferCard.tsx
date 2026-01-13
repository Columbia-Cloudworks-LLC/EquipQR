/**
 * PendingTransferCard - Card for accepting/rejecting ownership transfer
 * 
 * Displays when the current user has a pending incoming transfer request.
 * Allows them to accept (with role selection) or reject the transfer.
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  ArrowRightLeft, 
  Check, 
  X, 
  Loader2, 
  Clock,
  Building2
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { 
  useAcceptTransfer, 
  useRejectTransfer,
  type PendingTransferRequest 
} from '@/features/organization/hooks/useOwnershipTransfer';

interface PendingTransferCardProps {
  transfer: PendingTransferRequest;
}

export const PendingTransferCard: React.FC<PendingTransferCardProps> = ({
  transfer,
}) => {
  const [showAcceptDialog, setShowAcceptDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [departingOwnerRole, setDepartingOwnerRole] = useState<'admin' | 'member' | 'remove'>('admin');
  const [rejectReason, setRejectReason] = useState('');

  const acceptTransfer = useAcceptTransfer();
  const rejectTransfer = useRejectTransfer();

  const expiresIn = formatDistanceToNow(new Date(transfer.expires_at), { addSuffix: true });
  const isExpiringSoon = new Date(transfer.expires_at).getTime() - Date.now() < 24 * 60 * 60 * 1000;

  const handleAccept = async () => {
    try {
      await acceptTransfer.mutateAsync({
        transferId: transfer.id,
        departingOwnerRole,
      });
      setShowAcceptDialog(false);
    } catch {
      // Error handled by mutation
    }
  };

  const handleReject = async () => {
    try {
      await rejectTransfer.mutateAsync({
        transferId: transfer.id,
        responseReason: rejectReason || undefined,
      });
      setShowRejectDialog(false);
    } catch {
      // Error handled by mutation
    }
  };

  return (
    <>
      <Card className="border-primary bg-primary/5">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <ArrowRightLeft className="h-4 w-4 text-primary" />
              Ownership Transfer Request
            </CardTitle>
            <Badge variant={isExpiringSoon ? 'destructive' : 'secondary'}>
              <Clock className="h-3 w-3 mr-1" />
              Expires {expiresIn}
            </Badge>
          </div>
          <CardDescription>
            <strong>{transfer.from_user_name}</strong> wants to transfer ownership of{' '}
            <strong>{transfer.organization_name}</strong> to you.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {transfer.transfer_reason && (
            <div className="text-sm">
              <span className="text-muted-foreground">Reason: </span>
              <span>{transfer.transfer_reason}</span>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              onClick={() => setShowAcceptDialog(true)}
              className="flex-1"
            >
              <Check className="h-4 w-4 mr-2" />
              Accept Ownership
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowRejectDialog(true)}
              className="flex-1"
            >
              <X className="h-4 w-4 mr-2" />
              Decline
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Accept Dialog */}
      <AlertDialog open={showAcceptDialog} onOpenChange={setShowAcceptDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Accept Ownership Transfer
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <p>
                  You are about to become the owner of <strong>{transfer.organization_name}</strong>.
                </p>

                <div className="space-y-2">
                  <Label>What should happen to {transfer.from_user_name}?</Label>
                  <Select 
                    value={departingOwnerRole} 
                    onValueChange={(v) => setDepartingOwnerRole(v as 'admin' | 'member' | 'remove')}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">
                        <div className="flex flex-col">
                          <span>Keep as Admin</span>
                          <span className="text-xs text-muted-foreground">
                            They can still manage the organization
                          </span>
                        </div>
                      </SelectItem>
                      <SelectItem value="member">
                        <div className="flex flex-col">
                          <span>Demote to Member</span>
                          <span className="text-xs text-muted-foreground">
                            Limited access, cannot manage settings
                          </span>
                        </div>
                      </SelectItem>
                      <SelectItem value="remove">
                        <div className="flex flex-col">
                          <span>Remove from Organization</span>
                          <span className="text-xs text-muted-foreground">
                            They will lose all access
                          </span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <p className="text-sm text-muted-foreground">
                  Note: A new personal organization will be created for {transfer.from_user_name} 
                  if they don&apos;t own another organization.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleAccept}
              disabled={acceptTransfer.isPending}
            >
              {acceptTransfer.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Accepting...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Accept & Become Owner
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject Dialog */}
      <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Decline Ownership Transfer</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <p>
                  Are you sure you want to decline ownership of{' '}
                  <strong>{transfer.organization_name}</strong>?
                </p>
                <p>
                  {transfer.from_user_name} will be notified and can choose to transfer to someone else.
                </p>

                <div className="space-y-2">
                  <Label htmlFor="reject-reason">Reason (optional)</Label>
                  <Textarea
                    id="reject-reason"
                    placeholder="Let them know why you're declining..."
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    rows={2}
                  />
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReject}
              disabled={rejectTransfer.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {rejectTransfer.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Declining...
                </>
              ) : (
                <>
                  <X className="h-4 w-4 mr-2" />
                  Decline Transfer
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default PendingTransferCard;
