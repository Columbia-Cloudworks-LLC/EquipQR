/**
 * TransferOwnershipDialog - Dialog for transferring organization ownership
 * 
 * Allows the current owner to select an admin and initiate ownership transfer.
 * The target admin must accept the transfer for it to complete.
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertTriangle, ArrowRightLeft, Loader2, Building2 } from 'lucide-react';
import { useInitiateTransfer } from '@/features/organization/hooks/useOwnershipTransfer';
import type { SimpleOrganization } from '@/contexts/SimpleOrganizationContext';

interface TransferOwnershipDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organization: SimpleOrganization;
  admins: Array<{ id: string; userId: string; name: string; email: string }>;
}

export const TransferOwnershipDialog: React.FC<TransferOwnershipDialogProps> = ({
  open,
  onOpenChange,
  organization,
  admins,
}) => {
  const [selectedAdminId, setSelectedAdminId] = useState<string>('');
  const [reason, setReason] = useState('');
  const [confirmed, setConfirmed] = useState(false);

  const initiateTransfer = useInitiateTransfer();

  const selectedAdmin = admins.find(a => a.userId === selectedAdminId);

  const handleSubmit = async () => {
    if (!selectedAdminId || !confirmed) return;

    try {
      await initiateTransfer.mutateAsync({
        organizationId: organization.id,
        toUserId: selectedAdminId,
        transferReason: reason || undefined,
      });

      // Reset and close on success
      setSelectedAdminId('');
      setReason('');
      setConfirmed(false);
      onOpenChange(false);
    } catch {
      // Error handled by mutation
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Reset form on close
      setSelectedAdminId('');
      setReason('');
      setConfirmed(false);
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5" />
            Transfer Ownership
          </DialogTitle>
          <DialogDescription>
            Transfer ownership of <strong>{organization.name}</strong> to another admin.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Warning */}
          <Alert className="border-destructive/50 bg-destructive/10">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <AlertDescription className="text-destructive">
              <strong>Important:</strong> After transfer, you will no longer be the owner.
              A new personal organization will be created for you automatically.
            </AlertDescription>
          </Alert>

          {/* Admin Selection */}
          <div className="space-y-2">
            <Label htmlFor="admin-select">Transfer to</Label>
            <Select value={selectedAdminId} onValueChange={setSelectedAdminId}>
              <SelectTrigger id="admin-select">
                <SelectValue placeholder="Select an admin..." />
              </SelectTrigger>
              <SelectContent>
                {admins.map((admin) => (
                  <SelectItem key={admin.userId} value={admin.userId}>
                    <div className="flex flex-col">
                      <span>{admin.name}</span>
                      <span className="text-xs text-muted-foreground">{admin.email}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Only admins can receive ownership. Promote a member to admin first if needed.
            </p>
          </div>

          {/* Transfer Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason">Reason for transfer (optional)</Label>
            <Textarea
              id="reason"
              placeholder="e.g., Leaving company, role change..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
            />
          </div>

          {/* What happens after */}
          {selectedAdmin && (
            <div className="rounded-lg border p-4 space-y-2 bg-muted/50">
              <h4 className="font-medium text-sm">What happens next:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li className="flex items-start gap-2">
                  <span className="text-primary">1.</span>
                  <span>
                    <strong>{selectedAdmin.name}</strong> will receive a notification to accept or decline.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">2.</span>
                  <span>The request expires in 7 days if not responded to.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">3.</span>
                  <span>If accepted, they become the owner and choose your new role.</span>
                </li>
                <li className="flex items-start gap-2">
                  <Building2 className="h-4 w-4 text-primary mt-0.5" />
                  <span>A new personal organization will be created for you.</span>
                </li>
              </ul>
            </div>
          )}

          {/* Confirmation Checkbox */}
          <div className="flex items-start space-x-2 pt-2">
            <Checkbox
              id="confirm"
              checked={confirmed}
              onCheckedChange={(checked) => setConfirmed(checked === true)}
            />
            <Label htmlFor="confirm" className="text-sm leading-tight cursor-pointer">
              I understand that I will no longer be the owner of this organization
              and this action requires the new owner to accept.
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleSubmit}
            disabled={!selectedAdminId || !confirmed || initiateTransfer.isPending}
          >
            {initiateTransfer.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending Request...
              </>
            ) : (
              <>
                <ArrowRightLeft className="h-4 w-4 mr-2" />
                Send Transfer Request
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TransferOwnershipDialog;
