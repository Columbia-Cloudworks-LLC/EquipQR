import { useState } from 'react';

type EquipmentSummary = { id: string };

type BulkLinkMutation = {
  mutateAsync: (args: {
    organizationId: string;
    itemId: string;
    equipmentIds: string[];
  }) => Promise<unknown>;
  isPending: boolean;
};

type UseInventoryItemEquipmentDialogParams = {
  organizationId?: string;
  itemId?: string;
  compatibleEquipment: EquipmentSummary[];
  bulkLinkEquipmentMutation: BulkLinkMutation;
  showAddEquipmentDialog: boolean;
  setShowAddEquipmentDialog: (open: boolean) => void;
};

export function useInventoryItemEquipmentDialog({
  organizationId,
  itemId,
  compatibleEquipment,
  bulkLinkEquipmentMutation,
  showAddEquipmentDialog,
  setShowAddEquipmentDialog,
}: UseInventoryItemEquipmentDialogParams) {
  const [equipmentSearch, setEquipmentSearch] = useState('');
  const [selectedEquipmentIds, setSelectedEquipmentIds] = useState<string[]>([]);

  const handleOpenAddEquipmentDialog = () => {
    const currentEquipmentIds = compatibleEquipment.map((eq) => eq.id);
    setSelectedEquipmentIds(currentEquipmentIds);
    setEquipmentSearch('');
    setShowAddEquipmentDialog(true);
  };

  const handleSaveEquipmentCompatibility = async () => {
    if (!organizationId || !itemId) return;

    try {
      await bulkLinkEquipmentMutation.mutateAsync({
        organizationId,
        itemId,
        equipmentIds: selectedEquipmentIds,
      });
      setShowAddEquipmentDialog(false);
    } catch {
      // Errors handled in mutation
    }
  };

  const handleEquipmentToggle = (equipmentId: string, checked: boolean) => {
    if (checked) {
      setSelectedEquipmentIds((prev) => [...prev, equipmentId]);
    } else {
      setSelectedEquipmentIds((prev) => prev.filter((id) => id !== equipmentId));
    }
  };

  return {
    showAddEquipmentDialog,
    setShowAddEquipmentDialog,
    equipmentSearch,
    setEquipmentSearch,
    selectedEquipmentIds,
    handleOpenAddEquipmentDialog,
    handleSaveEquipmentCompatibility,
    handleEquipmentToggle,
    bulkLinkPending: bulkLinkEquipmentMutation.isPending,
  };
}
