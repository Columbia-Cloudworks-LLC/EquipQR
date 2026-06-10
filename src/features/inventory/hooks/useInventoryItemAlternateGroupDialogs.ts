import { useMemo, useState } from 'react';
import { logger } from '@/utils/logger';
import type { PartAlternateGroup } from '@/features/inventory/types/inventory';

type CreateGroupMutation = {
  mutateAsync: (args: {
    organizationId: string;
    data: { name: string; status: 'unverified' };
  }) => Promise<{ id: string }>;
  isPending: boolean;
};

type AddToGroupMutation = {
  mutateAsync: (args: {
    organizationId: string;
    groupId: string;
    inventoryItemId: string;
    isPrimary?: boolean;
  }) => Promise<unknown>;
  isPending: boolean;
};

type UseInventoryItemAlternateGroupDialogsParams = {
  organizationId?: string;
  itemId?: string;
  groupedAlternates: Array<[string, unknown[]]>;
  allGroups: PartAlternateGroup[];
  createGroupMutation: CreateGroupMutation;
  addToGroupMutation: AddToGroupMutation;
  refetchAlternates: () => void;
  showAddToGroupDialog: boolean;
  setShowAddToGroupDialog: (open: boolean) => void;
};

export function useInventoryItemAlternateGroupDialogs({
  organizationId,
  itemId,
  groupedAlternates,
  allGroups,
  createGroupMutation,
  addToGroupMutation,
  refetchAlternates,
  showAddToGroupDialog,
  setShowAddToGroupDialog,
}: UseInventoryItemAlternateGroupDialogsParams) {
  const [showCreateGroupDialog, setShowCreateGroupDialog] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [groupSearch, setGroupSearch] = useState('');

  const itemGroupIds = useMemo(
    () => new Set(groupedAlternates.map(([groupId]) => groupId)),
    [groupedAlternates],
  );

  const availableGroups = useMemo(
    () => allGroups.filter((group) => !itemGroupIds.has(group.id)),
    [allGroups, itemGroupIds],
  );

  const filteredGroups = useMemo(() => {
    if (!groupSearch.trim()) return availableGroups;
    const needle = groupSearch.toLowerCase();
    return availableGroups.filter(
      (group) =>
        group.name.toLowerCase().includes(needle) ||
        group.description?.toLowerCase().includes(needle),
    );
  }, [availableGroups, groupSearch]);

  const handleCreateGroupWithItem = async () => {
    if (!organizationId || !itemId || !newGroupName.trim()) return;
    try {
      const newGroup = await createGroupMutation.mutateAsync({
        organizationId,
        data: {
          name: newGroupName.trim(),
          status: 'unverified',
        },
      });
      await addToGroupMutation.mutateAsync({
        organizationId,
        groupId: newGroup.id,
        inventoryItemId: itemId,
        isPrimary: true,
      });
      setShowCreateGroupDialog(false);
      setNewGroupName('');
      refetchAlternates();
    } catch (error) {
      logger.error('Error creating group with item', error);
    }
  };

  const handleAddToGroup = async () => {
    if (!organizationId || !itemId || !selectedGroupId) return;
    try {
      await addToGroupMutation.mutateAsync({
        organizationId,
        groupId: selectedGroupId,
        inventoryItemId: itemId,
      });
      setShowAddToGroupDialog(false);
      setSelectedGroupId(null);
      setGroupSearch('');
      refetchAlternates();
    } catch (error) {
      logger.error('Error adding item to group', error);
    }
  };

  return {
    showCreateGroupDialog,
    setShowCreateGroupDialog,
    showAddToGroupDialog,
    setShowAddToGroupDialog,
    newGroupName,
    setNewGroupName,
    selectedGroupId,
    setSelectedGroupId,
    groupSearch,
    setGroupSearch,
    availableGroups,
    availableGroupsCount: availableGroups.length,
    filteredGroups,
    handleCreateGroupWithItem,
    handleAddToGroup,
    createGroupPending: createGroupMutation.isPending,
    addToGroupPending: addToGroupMutation.isPending,
  };
}
