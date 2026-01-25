/**
 * Google Workspace Member Import Sheet
 * 
 * A sheet/modal component that allows admins to sync and import members
 * from a connected Google Workspace directory.
 */

import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { RefreshCw, Search, Users, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAppToast } from '@/hooks/useAppToast';
import {
  listWorkspaceDirectoryUsersLight,
  selectGoogleWorkspaceMembers,
  syncGoogleWorkspaceUsers,
} from '@/services/google-workspace';
import { useGoogleWorkspaceMemberClaims } from '@/features/organization/hooks/useGoogleWorkspaceMemberClaims';
import { useOrganizationMembersQuery } from '@/features/organization/hooks/useOrganizationMembers';

interface GoogleWorkspaceMemberImportSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  domain: string | null;
}

export const GoogleWorkspaceMemberImportSheet = ({
  open,
  onOpenChange,
  organizationId,
  domain,
}: GoogleWorkspaceMemberImportSheetProps) => {
  const { toast } = useAppToast();
  const queryClient = useQueryClient();

  const [isSyncing, setIsSyncing] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set());
  const [adminEmails, setAdminEmails] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch directory users - uses light function with only essential fields
  const { data: directoryUsers = [], isLoading: isLoadingDirectory, refetch: refetchDirectory } = useQuery({
    queryKey: ['google-workspace', 'directory-users-light', organizationId],
    queryFn: () => listWorkspaceDirectoryUsersLight(organizationId),
    enabled: !!organizationId && open,
    staleTime: 60 * 1000,
  });

  // Fetch existing members and claims to filter them out
  // These will only run when the component is mounted (controlled by parent)
  const { data: existingMembers = [] } = useOrganizationMembersQuery(organizationId);
  const { data: existingClaims = [] } = useGoogleWorkspaceMemberClaims(organizationId);

  // Get emails that are already in the organization or pending
  // Normalize with trim().toLowerCase() for consistent matching
  const existingEmails = useMemo(() => {
    const emails = new Set<string>();
    existingMembers.forEach(m => {
      if (m.email) emails.add(m.email.trim().toLowerCase());
    });
    existingClaims.forEach(c => {
      emails.add(c.email.trim().toLowerCase());
    });
    return emails;
  }, [existingMembers, existingClaims]);

  // Count how many directory users are hidden because they're already in org or have pending claims
  const hiddenCount = useMemo(() => {
    return directoryUsers.filter(user => {
      const email = user.primary_email.trim().toLowerCase();
      return existingEmails.has(email);
    }).length;
  }, [directoryUsers, existingEmails]);

  // Filter directory users to only show those not already in org
  const availableUsers = useMemo(() => {
    return directoryUsers.filter(user => {
      const email = user.primary_email.trim().toLowerCase();
      // Filter out existing members/claims
      if (existingEmails.has(email)) return false;
      // Filter out suspended users
      if (user.suspended) return false;
      // Apply search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          user.primary_email.toLowerCase().includes(query) ||
          (user.full_name?.toLowerCase().includes(query) ?? false)
        );
      }
      return true;
    });
  }, [directoryUsers, existingEmails, searchQuery]);

  const handleSyncDirectory = async () => {
    setIsSyncing(true);
    try {
      const result = await syncGoogleWorkspaceUsers(organizationId);
      toast({
        title: 'Directory synced',
        description: `${result.usersSynced} users loaded from Google Workspace.`,
        variant: 'success',
      });
      await refetchDirectory();
    } catch (error) {
      toast({
        title: 'Failed to sync directory',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'error',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const toggleEmail = (email: string, checked: boolean) => {
    setSelectedEmails(prev => {
      const next = new Set(prev);
      if (checked) {
        next.add(email);
      } else {
        next.delete(email);
      }
      return next;
    });

    // If unchecking, also remove from admin emails
    if (!checked) {
      setAdminEmails(prev => {
        const next = new Set(prev);
        next.delete(email);
        return next;
      });
    }
  };

  const toggleAdmin = (email: string, checked: boolean) => {
    setAdminEmails(prev => {
      const next = new Set(prev);
      if (checked) {
        next.add(email);
      } else {
        next.delete(email);
      }
      return next;
    });
  };

  const toggleSelectAll = (checked: boolean) => {
    if (checked) {
      const newSelectedEmails = new Set(availableUsers.map(u => u.primary_email));
      setSelectedEmails(newSelectedEmails);
      // Reconcile adminEmails to only include emails that are in the new selected set
      setAdminEmails(prev => {
        const reconciled = new Set<string>();
        prev.forEach(email => {
          if (newSelectedEmails.has(email)) {
            reconciled.add(email);
          }
        });
        return reconciled;
      });
    } else {
      setSelectedEmails(new Set());
      setAdminEmails(new Set());
    }
  };

  // Reset local state when the sheet is closed to avoid stale selections
  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setSelectedEmails(new Set());
      setAdminEmails(new Set());
      setSearchQuery('');
    }
    onOpenChange(nextOpen);
  };

  const handleAddMembers = async () => {
    if (selectedEmails.size === 0) return;

    setIsAdding(true);
    try {
      // Normalize emails to trim/lowercase before sending to ensure consistency
      const normalizedSelected = Array.from(selectedEmails).map(e => e.trim().toLowerCase());
      const normalizedAdmins = Array.from(adminEmails).map(e => e.trim().toLowerCase());

      const result = await selectGoogleWorkspaceMembers(
        organizationId,
        normalizedSelected,
        normalizedAdmins
      );

      toast({
        title: 'Members added',
        description: `${result.members_added} members added. ${result.admin_applied} admins applied; ${result.admin_pending} pending.`,
        variant: 'success',
      });

      // Invalidate queries to refresh data
      await queryClient.invalidateQueries({ queryKey: ['gws-member-claims', organizationId] });
      await queryClient.invalidateQueries({ queryKey: ['organization-members', organizationId] });

      // Close the sheet via the wrapper to ensure local state is reset
      handleOpenChange(false);
    } catch (error) {
      toast({
        title: 'Failed to add members',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'error',
      });
    } finally {
      setIsAdding(false);
    }
  };

  // Compute selection states based on visible users to handle filtered state correctly
  const visibleSelectedCount = useMemo(
    () =>
      availableUsers.reduce((count, user) => {
        return selectedEmails.has(user.primary_email) ? count + 1 : count;
      }, 0),
    [availableUsers, selectedEmails]
  );

  const allSelected = availableUsers.length > 0 && visibleSelectedCount === availableUsers.length;
  const someSelected = visibleSelectedCount > 0 && visibleSelectedCount < availableUsers.length;

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Import from Google Workspace
          </SheetTitle>
          <SheetDescription>
            {domain ? (
              <>Select users from <span className="font-medium">{domain}</span> to add to your organization.</>
            ) : (
              'Select users from your Google Workspace directory to add to your organization.'
            )}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {/* Sync Button */}
          <div className="flex items-center gap-2">
            <Button onClick={handleSyncDirectory} disabled={isSyncing} variant="outline" size="sm">
              {isSyncing ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Sync Directory
            </Button>
            <span className="text-sm text-muted-foreground">
              {directoryUsers.length} users in directory
            </span>
          </div>

          {/* Info about filtered users */}
          {hiddenCount > 0 && (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                {hiddenCount} user{hiddenCount !== 1 ? 's' : ''} already in organization or pending claim (hidden).
              </AlertDescription>
            </Alert>
          )}

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* User List */}
          {isLoadingDirectory ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : availableUsers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {directoryUsers.length === 0 ? (
                <>
                  <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                  <p>No directory users found. Click "Sync Directory" to load users.</p>
                </>
              ) : searchQuery ? (
                <p>No users match your search.</p>
              ) : (
                <p>All directory users are already in your organization.</p>
              )}
            </div>
          ) : (
            <>
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={someSelected ? 'indeterminate' : allSelected}
                          onCheckedChange={(checked) => toggleSelectAll(Boolean(checked))}
                          aria-label="Select all"
                        />
                      </TableHead>
                      <TableHead>User</TableHead>
                      <TableHead className="w-24">Admin</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {availableUsers.map((user) => {
                      const email = user.primary_email;
                      const isSelected = selectedEmails.has(email);
                      const isAdmin = adminEmails.has(email);
                      return (
                        <TableRow key={user.id}>
                          <TableCell>
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={(checked) => toggleEmail(email, Boolean(checked))}
                              aria-label={`Select ${email}`}
                            />
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{user.full_name || email}</div>
                              {user.full_name && (
                                <div className="text-sm text-muted-foreground">{email}</div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Checkbox
                              checked={isAdmin}
                              disabled={!isSelected}
                              onCheckedChange={(checked) => toggleAdmin(email, Boolean(checked))}
                              aria-label={`Make ${email} admin`}
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Add Button */}
              <div className="flex items-center justify-between pt-4 border-t">
                <span className="text-sm text-muted-foreground">
                  {selectedEmails.size} selected{adminEmails.size > 0 && ` (${adminEmails.size} as admin)`}
                </span>
                <Button
                  onClick={handleAddMembers}
                  disabled={selectedEmails.size === 0 || isAdding}
                >
                  {isAdding ? (
                    <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  Add {selectedEmails.size > 0 ? selectedEmails.size : ''} Member{selectedEmails.size !== 1 ? 's' : ''}
                </Button>
              </div>

              <p className="text-xs text-muted-foreground">
                Selected users will be able to join automatically when they sign in with their Google account.
              </p>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default GoogleWorkspaceMemberImportSheet;
