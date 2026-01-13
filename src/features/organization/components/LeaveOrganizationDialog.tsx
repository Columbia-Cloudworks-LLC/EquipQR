/**
 * LeaveOrganizationDialog - Dialog for leaving an organization
 * 
 * Allows non-owners to leave an organization. Requires typing the
 * organization name to confirm.
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, UserMinus, Loader2 } from 'lucide-react';
import { useLeaveOrganization } from '@/features/organization/hooks/useLeaveOrganization';
import type { SimpleOrganization } from '@/contexts/SimpleOrganizationContext';

interface LeaveOrganizationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organization: SimpleOrganization;
}

export const LeaveOrganizationDialog: React.FC<LeaveOrganizationDialogProps> = ({
  open,
  onOpenChange,
  organization,
}) => {
  const [confirmationName, setConfirmationName] = useState('');

  const leaveOrganization = useLeaveOrganization();

  const isNameMatch = confirmationName.toLowerCase().trim() === organization.name.toLowerCase().trim();

  const handleSubmit = async () => {
    if (!isNameMatch) return;

    try {
      await leaveOrganization.mutateAsync({
        organizationId: organization.id,
      });

      // Reset and close on success
      setConfirmationName('');
      onOpenChange(false);
    } catch {
      // Error handled by mutation
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setConfirmationName('');
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <UserMinus className="h-5 w-5" />
            Leave Organization
          </DialogTitle>
          <DialogDescription>
            You are about to leave <strong>{organization.name}</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Warning */}
          <Alert className="border-destructive bg-destructive/10">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <AlertDescription className="text-destructive">
              <strong>Warning:</strong> This action cannot be undone.
              You will lose access to all organization data immediately.
            </AlertDescription>
          </Alert>

          {/* What will happen */}
          <div className="rounded-lg border p-4 space-y-2 bg-muted/50">
            <h4 className="font-medium text-sm">What happens when you leave:</h4>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>You will be removed from all teams</li>
              <li>You will lose access to equipment and work orders</li>
              <li>Your notes and actions will be preserved for audit</li>
              <li>You will need a new invitation to rejoin</li>
            </ul>
          </div>

          {/* Confirmation Input */}
          <div className="space-y-2">
            <Label htmlFor="confirm-name">
              Type <strong>{organization.name}</strong> to confirm
            </Label>
            <Input
              id="confirm-name"
              placeholder={organization.name}
              value={confirmationName}
              onChange={(e) => setConfirmationName(e.target.value)}
              className={isNameMatch ? 'border-green-500' : ''}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleSubmit}
            disabled={!isNameMatch || leaveOrganization.isPending}
          >
            {leaveOrganization.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Leaving...
              </>
            ) : (
              <>
                <UserMinus className="h-4 w-4 mr-2" />
                Leave Organization
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default LeaveOrganizationDialog;
