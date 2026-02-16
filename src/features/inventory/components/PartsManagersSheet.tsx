import React, { useState, useMemo } from 'react';
import { Users, Search, Trash2, Plus, X, ShieldCheck } from 'lucide-react';
import { useOrganization } from '@/contexts/OrganizationContext';
import { usePermissions } from '@/hooks/usePermissions';
import { useOrganizationMembers } from '@/features/organization/hooks/useOrganizationMembers';
import {
  usePartsManagers,
  useAddPartsManager,
  useRemovePartsManager,
} from '@/features/inventory/hooks/usePartsManagers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { format } from 'date-fns';
import type { PartsManager } from '@/features/inventory/services/partsManagersService';

interface PartsManagersSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const PartsManagersSheet: React.FC<PartsManagersSheetProps> = ({
  open,
  onOpenChange,
}) => {
  const { currentOrganization } = useOrganization();
  const { canManagePartsManagers } = usePermissions();
  const canManage = canManagePartsManagers();

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [removingManager, setRemovingManager] = useState<PartsManager | null>(null);
  const [memberSearch, setMemberSearch] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  const { data: partsManagers = [], isLoading } = usePartsManagers(
    currentOrganization?.id
  );
  const { data: members = [] } = useOrganizationMembers(
    currentOrganization?.id ?? ''
  );

  const addMutation = useAddPartsManager();
  const removeMutation = useRemovePartsManager();

  // Filter out users who are already parts managers or are owners/admins
  const availableMembers = useMemo(() => {
    const managerUserIds = new Set(partsManagers.map((pm) => pm.user_id));
    return members.filter(
      (m) =>
        m.status === 'active' &&
        !managerUserIds.has(m.id) &&
        // Don't show owners/admins - they already have full access
        m.role === 'member'
    );
  }, [members, partsManagers]);

  // Filter by search
  const filteredMembers = useMemo(() => {
    if (!memberSearch.trim()) return availableMembers;
    const needle = memberSearch.toLowerCase();
    return availableMembers.filter(
      (m) =>
        (m.name ?? '').toLowerCase().includes(needle) ||
        (m.email ?? '').toLowerCase().includes(needle)
    );
  }, [availableMembers, memberSearch]);

  const handleAddManagers = async () => {
    if (!currentOrganization || selectedUserIds.length === 0) return;
    try {
      await Promise.all(
        selectedUserIds.map((userId) =>
          addMutation.mutateAsync({
            organizationId: currentOrganization.id,
            userId,
          })
        )
      );
      setShowAddDialog(false);
      setSelectedUserIds([]);
      setMemberSearch('');
    } catch {
      // Error handled by mutation
    }
  };

  const handleRemoveManager = async () => {
    if (!currentOrganization || !removingManager) return;
    try {
      await removeMutation.mutateAsync({
        organizationId: currentOrganization.id,
        userId: removingManager.user_id,
      });
      setRemovingManager(null);
    } catch {
      // Error handled by mutation
    }
  };

  const handleToggleUser = (userId: string, checked: boolean) => {
    setSelectedUserIds((prev) =>
      checked ? [...prev, userId] : prev.filter((id) => id !== userId)
    );
  };

  const handleCloseAddDialog = () => {
    setShowAddDialog(false);
    setSelectedUserIds([]);
    setMemberSearch('');
  };

  if (!canManage) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Parts Managers</SheetTitle>
            <SheetDescription>
              Manage who can edit inventory items
            </SheetDescription>
          </SheetHeader>
          <div className="py-12 text-center">
            <ShieldCheck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Access Denied</h3>
            <p className="text-muted-foreground">
              Only organization owners and admins can manage parts managers.
            </p>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Parts Managers
            </SheetTitle>
            <SheetDescription>
              Parts managers can create, edit, and manage all inventory items.
              Organization owners and admins automatically have these permissions.
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-4">
            {/* Add Manager Button */}
            <Button onClick={() => setShowAddDialog(true)} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Add Manager
            </Button>

            {/* Managers List */}
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : partsManagers.length === 0 ? (
              <div className="text-center py-8 border rounded-lg bg-muted/30">
                <Users className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground mb-2">
                  No parts managers assigned yet
                </p>
                <p className="text-sm text-muted-foreground">
                  Organization owners and admins can always manage inventory.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {partsManagers.map((manager) => (
                  <div
                    key={manager.user_id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm truncate">
                          {manager.userName}
                        </p>
                        <Badge variant="secondary" className="text-xs shrink-0">
                          Parts Manager
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {manager.userEmail}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Added {format(new Date(manager.assigned_at), 'PPP')}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0 ml-2"
                      onClick={() => setRemovingManager(manager)}
                      disabled={removeMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Info Section */}
            <div className="border rounded-lg bg-muted/30 p-4 mt-6">
              <h4 className="font-medium text-sm mb-2">About Permissions</h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• <strong>Owners & Admins</strong> can always manage inventory.</li>
                <li>• <strong>Parts Managers</strong> can create, edit, and delete items.</li>
                <li>• <strong>Members</strong> can only view inventory.</li>
              </ul>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Add Parts Manager Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Parts Managers</DialogTitle>
            <DialogDescription>
              Select organization members to grant parts manager permissions.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search members..."
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="max-h-60 overflow-y-auto border rounded-md p-2 space-y-1">
              {filteredMembers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {availableMembers.length === 0
                    ? 'All eligible members are already parts managers'
                    : 'No members found matching your search'}
                </p>
              ) : (
                filteredMembers.map((member) => {
                  const isSelected = selectedUserIds.includes(member.id);
                  return (
                    <div
                      key={member.id}
                      className="flex items-center space-x-3 p-2 hover:bg-muted/50 rounded"
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) =>
                          handleToggleUser(member.id, checked as boolean)
                        }
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">{member.name || 'Unknown'}</p>
                        <p className="text-sm text-muted-foreground">
                          {member.email}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {selectedUserIds.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedUserIds.map((id) => {
                  const member = members.find((m) => m.id === id);
                  return member ? (
                    <Badge key={id} variant="secondary" className="gap-1">
                      {member.name || member.email}
                      <button
                        type="button"
                        onClick={() => handleToggleUser(id, false)}
                        className="ml-1"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ) : null;
                })}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleCloseAddDialog}>
                Cancel
              </Button>
              <Button
                onClick={handleAddManagers}
                disabled={selectedUserIds.length === 0 || addMutation.isPending}
              >
                {addMutation.isPending
                  ? 'Adding...'
                  : `Add ${selectedUserIds.length > 0 ? selectedUserIds.length : ''} Manager${selectedUserIds.length !== 1 ? 's' : ''}`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Remove Manager Confirmation */}
      <AlertDialog
        open={!!removingManager}
        onOpenChange={() => setRemovingManager(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Parts Manager?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {removingManager?.userName} as a
              parts manager? They will no longer be able to edit inventory items.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveManager}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default PartsManagersSheet;
