import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  Layers,
  CheckCircle2,
  MoreHorizontal,
  Pencil,
  Trash2,
  Eye,
} from 'lucide-react';
import { useOrganization } from '@/contexts/OrganizationContext';
import { usePermissions } from '@/hooks/usePermissions';
import {
  useAlternateGroups,
  useDeleteAlternateGroup,
} from '@/features/inventory/hooks/useAlternateGroups';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import Page from '@/components/layout/Page';
import PageHeader from '@/components/layout/PageHeader';
import { AlternateGroupForm } from '@/features/inventory/components/AlternateGroupForm';
import type { PartAlternateGroup } from '@/features/inventory/types/inventory';

const AlternateGroupsPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentOrganization } = useOrganization();
  const { canCreateEquipment } = usePermissions();
  const canEdit = canCreateEquipment();

  const [search, setSearch] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingGroup, setEditingGroup] = useState<PartAlternateGroup | null>(null);
  const [deletingGroup, setDeletingGroup] = useState<PartAlternateGroup | null>(null);

  const { data: groups = [], isLoading } = useAlternateGroups(currentOrganization?.id);
  const deleteMutation = useDeleteAlternateGroup();

  // Filter groups by search
  const filteredGroups = useMemo(() => {
    if (!search.trim()) return groups;
    const needle = search.toLowerCase();
    return groups.filter(
      (g) =>
        g.name.toLowerCase().includes(needle) ||
        g.description?.toLowerCase().includes(needle)
    );
  }, [groups, search]);

  const handleViewGroup = (groupId: string) => {
    navigate(`/dashboard/alternate-groups/${groupId}`);
  };

  const handleDeleteGroup = async () => {
    if (!currentOrganization || !deletingGroup) return;
    try {
      await deleteMutation.mutateAsync({
        organizationId: currentOrganization.id,
        groupId: deletingGroup.id,
      });
      setDeletingGroup(null);
    } catch {
      // Error handled by mutation
    }
  };

  if (!currentOrganization) {
    return (
      <Page maxWidth="7xl" padding="responsive">
        <PageHeader
          title="Alternate Part Groups"
          description="Please select an organization."
        />
      </Page>
    );
  }

  return (
    <Page maxWidth="7xl" padding="responsive">
      <div className="space-y-6">
        <PageHeader
          title="Alternate Part Groups"
          description="Manage groups of interchangeable parts. Parts in the same group can substitute for each other."
          actions={
            canEdit && (
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                New Group
              </Button>
            )
          }
        />

        {/* Search Bar */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search groups..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Groups List */}
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2 mt-2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredGroups.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Layers className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              {groups.length === 0 ? (
                <>
                  <h3 className="text-lg font-semibold mb-2">No alternate groups yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Create a group to define interchangeable parts that technicians can substitute for each other.
                  </p>
                  {canEdit && (
                    <Button onClick={() => setShowCreateDialog(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create First Group
                    </Button>
                  )}
                </>
              ) : (
                <>
                  <h3 className="text-lg font-semibold mb-2">No groups found</h3>
                  <p className="text-muted-foreground">
                    No groups match "{search}". Try a different search term.
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredGroups.map((group) => (
              <Card
                key={group.id}
                className="cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => handleViewGroup(group.id)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0 pr-2">
                      <CardTitle className="text-lg flex items-center gap-2 flex-wrap">
                        <span className="truncate">{group.name}</span>
                        {group.status === 'verified' && (
                          <Badge className="bg-green-600 shrink-0">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Verified
                          </Badge>
                        )}
                        {group.status === 'deprecated' && (
                          <Badge variant="secondary" className="shrink-0">
                            Deprecated
                          </Badge>
                        )}
                      </CardTitle>
                      {group.description && (
                        <CardDescription className="mt-1 line-clamp-2">
                          {group.description}
                        </CardDescription>
                      )}
                    </div>
                    {canEdit && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="shrink-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewGroup(group.id);
                            }}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingGroup(group);
                            }}
                          >
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeletingGroup(group);
                            }}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {group.notes && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {group.notes}
                    </p>
                  )}
                  {!group.notes && !group.description && (
                    <p className="text-sm text-muted-foreground italic">
                      No description
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Alternate Group</DialogTitle>
            <DialogDescription>
              Create a group for interchangeable parts that can substitute for each other.
            </DialogDescription>
          </DialogHeader>
          <AlternateGroupForm
            onSuccess={() => setShowCreateDialog(false)}
            onCancel={() => setShowCreateDialog(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingGroup} onOpenChange={() => setEditingGroup(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Alternate Group</DialogTitle>
            <DialogDescription>
              Update the group details. Changes will apply immediately.
            </DialogDescription>
          </DialogHeader>
          {editingGroup && (
            <AlternateGroupForm
              group={editingGroup}
              onSuccess={() => setEditingGroup(null)}
              onCancel={() => setEditingGroup(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingGroup} onOpenChange={() => setDeletingGroup(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Alternate Group?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingGroup?.name}"? This will remove
              all part associations in this group. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteGroup}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Page>
  );
};

export default AlternateGroupsPage;
