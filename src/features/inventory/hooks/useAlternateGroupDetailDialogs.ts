import { useMemo, useState } from 'react';
import type { PartIdentifierType } from '@/features/inventory/types/inventory';
import type { InventoryItem } from '@/features/inventory/types/inventory';
import type { AlternateGroupMember } from '@/features/inventory/services/partAlternatesService';
import type { PartAlternateGroup } from '@/features/inventory/types/inventory';
import {
  useAddInventoryItemToGroup,
  useAddPartIdentifierToGroup,
  useRemoveGroupMember,
} from '@/features/inventory/hooks/useAlternateGroups';

type UseAlternateGroupDetailDialogsParams = {
  organizationId?: string;
  groupId?: string;
  group?: PartAlternateGroup | null;
  inventoryItems: InventoryItem[];
};

export function useAlternateGroupDetailDialogs({
  organizationId,
  groupId,
  group,
  inventoryItems,
}: UseAlternateGroupDetailDialogsParams) {
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showAddItemDialog, setShowAddItemDialog] = useState(false);
  const [showAddIdentifierDialog, setShowAddIdentifierDialog] = useState(false);
  const [removingMember, setRemovingMember] = useState<AlternateGroupMember | null>(null);

  const [itemSearch, setItemSearch] = useState('');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [isPrimaryItem, setIsPrimaryItem] = useState(false);

  const [identifierType, setIdentifierType] = useState<PartIdentifierType>('oem');
  const [identifierValue, setIdentifierValue] = useState('');
  const [identifierManufacturer, setIdentifierManufacturer] = useState('');

  const addItemMutation = useAddInventoryItemToGroup();
  const addIdentifierMutation = useAddPartIdentifierToGroup();
  const removeMemberMutation = useRemoveGroupMember();

  const availableItems = useMemo(() => {
    if (!group) return inventoryItems;
    const memberItemIds = new Set(
      group.members.filter((m) => m.inventory_item_id).map((m) => m.inventory_item_id),
    );
    return inventoryItems.filter((item) => !memberItemIds.has(item.id));
  }, [inventoryItems, group]);

  const filteredItems = useMemo(() => {
    if (!itemSearch.trim()) return [];
    const needle = itemSearch.toLowerCase();
    return availableItems
      .filter(
        (item) =>
          item.name.toLowerCase().includes(needle) ||
          item.sku?.toLowerCase().includes(needle),
      )
      .slice(0, 20);
  }, [availableItems, itemSearch]);

  const closeAddItemDialog = () => {
    setShowAddItemDialog(false);
    setSelectedItemId(null);
    setIsPrimaryItem(false);
    setItemSearch('');
  };

  const closeAddIdentifierDialog = () => {
    setShowAddIdentifierDialog(false);
    setIdentifierType('oem');
    setIdentifierValue('');
    setIdentifierManufacturer('');
  };

  const handleAddItem = async () => {
    if (!organizationId || !groupId || !selectedItemId) return;
    try {
      await addItemMutation.mutateAsync({
        organizationId,
        groupId,
        inventoryItemId: selectedItemId,
        isPrimary: isPrimaryItem,
      });
      closeAddItemDialog();
    } catch {
      // Error handled by mutation
    }
  };

  const handleAddIdentifier = async () => {
    if (!organizationId || !groupId || !identifierValue.trim()) return;
    try {
      await addIdentifierMutation.mutateAsync({
        organizationId,
        groupId,
        identifierType,
        rawValue: identifierValue.trim(),
        manufacturer: identifierManufacturer.trim() || undefined,
      });
      closeAddIdentifierDialog();
    } catch {
      // Error handled by mutation
    }
  };

  const handleRemoveMember = async () => {
    if (!organizationId || !groupId || !removingMember) return;
    try {
      await removeMemberMutation.mutateAsync({
        organizationId,
        groupId,
        memberId: removingMember.id,
      });
      setRemovingMember(null);
    } catch {
      // Error handled by mutation
    }
  };

  return {
    showEditDialog,
    setShowEditDialog,
    showAddItemDialog,
    setShowAddItemDialog,
    showAddIdentifierDialog,
    setShowAddIdentifierDialog,
    removingMember,
    setRemovingMember,
    itemSearch,
    setItemSearch,
    selectedItemId,
    setSelectedItemId,
    isPrimaryItem,
    setIsPrimaryItem,
    identifierType,
    setIdentifierType,
    identifierValue,
    setIdentifierValue,
    identifierManufacturer,
    setIdentifierManufacturer,
    availableItems,
    filteredItems,
    closeAddItemDialog,
    closeAddIdentifierDialog,
    handleAddItem,
    handleAddIdentifier,
    handleRemoveMember,
    addItemMutation,
    addIdentifierMutation,
    removeMemberMutation,
  };
}
