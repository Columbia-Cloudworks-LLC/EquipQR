import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  Layers,
  CheckCircle2,
  AlertTriangle,
  MoreHorizontal,
  Pencil,
  Trash2,
  Eye,
  X,
  ArrowUpDown,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import Page from '@/components/layout/Page';
import PageHeader from '@/components/layout/PageHeader';
import HorizontalChipRow from '@/components/layout/HorizontalChipRow';
import { useIsMobile } from '@/hooks/use-mobile';
import { AlternateGroupForm } from '@/features/inventory/components/AlternateGroupForm';
import type { PartAlternateGroup } from '@/features/inventory/types/inventory';

type GroupStatusFilter = 'all' | 'verified' | 'unverified' | 'deprecated';
type GroupSortOption = 'name-asc' | 'name-desc' | 'updated-desc' | 'updated-asc';

const AlternateGroupsPage: React.FC = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { currentOrganization } = useOrganization();
  const { canCreateEquipment } = usePermissions();
  const canEdit = canCreateEquipment();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<GroupStatusFilter>('all');
  const [sortBy, setSortBy] = useState<GroupSortOption>('name-asc');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingGroup, setEditingGroup] = useState<PartAlternateGroup | null>(null);
  const [deletingGroup, setDeletingGroup] = useState<PartAlternateGroup | null>(null);
  const [actionMenuGroup, setActionMenuGroup] = useState<PartAlternateGroup | null>(null);

  const { data: groups = [], isLoading } = useAlternateGroups(currentOrganization?.id);
  const deleteMutation = useDeleteAlternateGroup();

  // Filter and sort groups
  const filteredGroups = useMemo(() => {
    const needle = search.trim().toLowerCase();

    const filtered = groups.filter((group) => {
      const matchesSearch =
        !needle ||
        group.name.toLowerCase().includes(needle) ||
        group.description?.toLowerCase().includes(needle);
      const matchesStatus = statusFilter === 'all' || group.status === statusFilter;

      return matchesSearch && matchesStatus;
    });

    const sorted = [...filtered];
    sorted.sort((a, b) => {
      switch (sortBy) {
        case 'name-desc':
          return b.name.localeCompare(a.name);
        case 'updated-desc':
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
        case 'updated-asc':
          return new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
        case 'name-asc':
        default:
          return a.name.localeCompare(b.name);
      }
    });

    return sorted;
  }, [groups, search, statusFilter, sortBy]);

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
          hideDescriptionOnMobile
          actions={
            canEdit && (
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                New Group
              </Button>
            )
          }
        />

        {/* Search + Sort */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search by name or description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-9"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="w-full md:w-56">
            <Select value={sortBy} onValueChange={(value) => setSortBy(value as GroupSortOption)}>
              <SelectTrigger aria-label="Sort alternate groups">
                <ArrowUpDown className="h-4 w-4 mr-2 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name-asc">Name (A-Z)</SelectItem>
                <SelectItem value="name-desc">Name (Z-A)</SelectItem>
                <SelectItem value="updated-desc">Recently Modified</SelectItem>
                <SelectItem value="updated-asc">Oldest Modified</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Status Filters */}
        <HorizontalChipRow ariaLabel="Alternate group status filters">
          {[
            { value: 'all', label: 'All' },
            { value: 'verified', label: 'Verified' },
            { value: 'unverified', label: 'Unverified' },
            { value: 'deprecated', label: 'Deprecated' },
          ].map((status) => (
            <Button
              key={status.value}
              type="button"
              size="sm"
              variant={statusFilter === status.value ? 'default' : 'outline'}
              className="whitespace-nowrap"
              onClick={() => setStatusFilter(status.value as GroupStatusFilter)}
            >
              {status.label}
            </Button>
          ))}
        </HorizontalChipRow>

        {statusFilter !== 'all' && (
          <div className="flex items-center gap-2">
            <Badge variant="secondary">
              Status: {statusFilter}
            </Badge>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setStatusFilter('all')}
            >
              <X className="h-3.5 w-3.5 mr-1" />
              Clear filter
            </Button>
          </div>
        )}

        {!isLoading && groups.length > 0 && (
          <p className="text-sm text-muted-foreground">
            Showing {filteredGroups.length} of {groups.length} group{groups.length === 1 ? '' : 's'}
          </p>
        )}

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
          <TooltipProvider>
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
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="truncate">{group.name}</span>
                            </TooltipTrigger>
                            <TooltipContent>{group.name}</TooltipContent>
                          </Tooltip>
                          {group.status === 'verified' && (
                            <Badge className="bg-success shrink-0">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Verified
                            </Badge>
                          )}
                          {group.status === 'deprecated' && (
                            <Badge variant="outline" className="shrink-0 border-warning text-warning bg-warning/10">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Deprecated
                            </Badge>
                          )}
                          {group.status === 'unverified' && (
                            <Badge variant="outline" className="shrink-0 text-muted-foreground">
                              Unverified
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
                        <>
                          {isMobile ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="shrink-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActionMenuGroup(group);
                              }}
                              aria-label={`More options for ${group.name}`}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          ) : (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                <Button variant="ghost" size="icon" className="shrink-0" aria-label={`More options for ${group.name}`}>
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
                        </>
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
                    {typeof group.member_count === 'number' && (
                      <p className="text-xs text-muted-foreground mt-2">
                        {group.member_count} part{group.member_count === 1 ? '' : 's'}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TooltipProvider>
        )}
      </div>

      <Drawer open={!!actionMenuGroup} onOpenChange={(open) => !open && setActionMenuGroup(null)}>
        <DrawerContent className="max-h-[50dvh]">
          <DrawerHeader>
            <DrawerTitle>Group Actions</DrawerTitle>
            <DrawerDescription>{actionMenuGroup?.name}</DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-4 space-y-2">
            <Button
              type="button"
              variant="outline"
              className="w-full justify-start min-h-11"
              onClick={() => {
                if (!actionMenuGroup) return;
                handleViewGroup(actionMenuGroup.id);
                setActionMenuGroup(null);
              }}
            >
              <Eye className="h-4 w-4 mr-2" />
              View Details
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full justify-start min-h-11"
              onClick={() => {
                if (!actionMenuGroup) return;
                setEditingGroup(actionMenuGroup);
                setActionMenuGroup(null);
              }}
            >
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full justify-start min-h-11 text-destructive"
              onClick={() => {
                if (!actionMenuGroup) return;
                setDeletingGroup(actionMenuGroup);
                setActionMenuGroup(null);
              }}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>
        </DrawerContent>
      </Drawer>

      {/* Create Dialog / Drawer */}
      {isMobile ? (
        <Drawer open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DrawerContent className="max-h-[85dvh]">
            <DrawerHeader>
              <DrawerTitle>Create Alternate Group</DrawerTitle>
              <DrawerDescription>
                Create a group for interchangeable parts that can substitute for each other.
              </DrawerDescription>
            </DrawerHeader>
            <div className="px-4 pb-4 overflow-y-auto">
              <AlternateGroupForm
                onSuccess={() => setShowCreateDialog(false)}
                onCancel={() => setShowCreateDialog(false)}
              />
            </div>
          </DrawerContent>
        </Drawer>
      ) : (
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
      )}

      {/* Edit Dialog / Drawer */}
      {isMobile ? (
        <Drawer open={!!editingGroup} onOpenChange={(open) => !open && setEditingGroup(null)}>
          <DrawerContent className="max-h-[85dvh]">
            <DrawerHeader>
              <DrawerTitle>Edit Alternate Group</DrawerTitle>
              <DrawerDescription>
                Update the group details. Changes will apply immediately.
              </DrawerDescription>
            </DrawerHeader>
            {editingGroup && (
              <div className="px-4 pb-4 overflow-y-auto">
                <AlternateGroupForm
                  group={editingGroup}
                  onSuccess={() => setEditingGroup(null)}
                  onCancel={() => setEditingGroup(null)}
                />
              </div>
            )}
          </DrawerContent>
        </Drawer>
      ) : (
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
      )}

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

