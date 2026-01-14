/**
 * DeleteOrganizationDialog - Dialog for deleting an organization
 * 
 * Allows the owner to permanently delete an organization. Shows stats
 * about what will be deleted and requires typing organization name.
 */

import React, { useState, useEffect } from 'react';
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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  AlertTriangle, 
  Trash2, 
  Loader2,
  Package,
  ClipboardList,
  Users,
  Boxes
} from 'lucide-react';
import { 
  useDeleteOrganization, 
  useOrganizationDeletionStats 
} from '@/features/organization/hooks/useDeleteOrganization';
import type { SimpleOrganization } from '@/contexts/SimpleOrganizationContext';

interface DeleteOrganizationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organization: SimpleOrganization;
}

export const DeleteOrganizationDialog: React.FC<DeleteOrganizationDialogProps> = ({
  open,
  onOpenChange,
  organization,
}) => {
  const [confirmationName, setConfirmationName] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [forceDelete, setForceDelete] = useState(false);

  // Fetch deletion stats when dialog opens
  const { data: stats, isLoading: statsLoading } = useOrganizationDeletionStats(
    organization.id,
    open
  );

  const deleteOrganization = useDeleteOrganization();

  const isNameMatch = confirmationName.toLowerCase().trim() === organization.name.toLowerCase().trim();
  const hasMembersBlocking = stats?.member_count && stats.member_count > 0 && !forceDelete;
  const canDelete = isNameMatch && confirmed && !hasMembersBlocking;

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setConfirmationName('');
      setConfirmed(false);
      setForceDelete(false);
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!canDelete) return;

    try {
      await deleteOrganization.mutateAsync({
        organizationId: organization.id,
        confirmationName: confirmationName.trim(),
        force: forceDelete,
      });

      // Dialog will close via navigation after successful deletion
      onOpenChange(false);
    } catch {
      // Error handled by mutation
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="h-5 w-5" />
            Delete Organization
          </DialogTitle>
          <DialogDescription>
            Permanently delete <strong>{organization.name}</strong> and all its data.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Severe Warning */}
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Danger Zone</AlertTitle>
            <AlertDescription>
              This action is <strong>permanent and irreversible</strong>. 
              All data will be deleted immediately and cannot be recovered.
            </AlertDescription>
          </Alert>

          {/* Deletion Stats */}
          <div className="rounded-lg border border-destructive/50 p-4 space-y-3">
            <h4 className="font-medium text-sm text-destructive">
              The following will be permanently deleted:
            </h4>
            
            {statsLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ) : stats ? (
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <span>
                    <strong>{stats.equipment_count}</strong> equipment
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <ClipboardList className="h-4 w-4 text-muted-foreground" />
                  <span>
                    <strong>{stats.work_order_count}</strong> work orders
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span>
                    <strong>{stats.team_count}</strong> teams
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Boxes className="h-4 w-4 text-muted-foreground" />
                  <span>
                    <strong>{stats.inventory_count}</strong> inventory items
                  </span>
                </div>
              </div>
            ) : null}

            {/* Members warning */}
            {stats && stats.member_count > 0 && (
              <Alert className="border-yellow-500/50 bg-yellow-500/10">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-yellow-700 dark:text-yellow-400">
                  This organization has <strong>{stats.member_count} other member(s)</strong>.
                  They will lose access when the organization is deleted.
                  <div className="mt-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="force-delete"
                        checked={forceDelete}
                        onCheckedChange={(checked) => setForceDelete(checked === true)}
                      />
                      <Label 
                        htmlFor="force-delete" 
                        className="text-sm cursor-pointer"
                      >
                        I understand members will lose access
                      </Label>
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Confirmation Input */}
          <div className="space-y-2">
            <Label htmlFor="confirm-delete-name">
              Type <strong className="text-destructive">{organization.name}</strong> to confirm deletion
            </Label>
            <Input
              id="confirm-delete-name"
              placeholder={organization.name}
              value={confirmationName}
              onChange={(e) => setConfirmationName(e.target.value)}
              className={isNameMatch ? 'border-destructive' : ''}
            />
          </div>

          {/* Final Confirmation */}
          <div className="flex items-start space-x-2">
            <Checkbox
              id="confirm-delete"
              checked={confirmed}
              onCheckedChange={(checked) => setConfirmed(checked === true)}
            />
            <Label 
              htmlFor="confirm-delete" 
              className="text-sm leading-tight cursor-pointer"
            >
              I understand this action is permanent and all organization data will be deleted forever.
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleSubmit}
            disabled={!canDelete || deleteOrganization.isPending}
          >
            {deleteOrganization.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Organization Forever
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DeleteOrganizationDialog;
