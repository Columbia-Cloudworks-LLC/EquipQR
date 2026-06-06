import { lazy, Suspense } from 'react';
import { Search, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { SelectedEquipmentBadgeList } from '@/components/common/SelectedEquipmentBadgeList';
import { InventoryEquipmentPickerRow } from '@/features/inventory/components/InventoryEquipmentPickerRow';
import InventoryQRCodeDisplay from '@/features/inventory/components/InventoryQRCodeDisplay';
import { InventoryItemForm } from '@/features/inventory/components/InventoryItemForm';
import { InventoryItemAdjustQuantityDialog } from '@/features/inventory/pages/components/InventoryItemAdjustQuantityDialog';
import type { PartAlternateGroup, PartCompatibilityRuleFormData } from '@/features/inventory/types/inventory';
import type { InventoryItem } from '@/features/inventory/types/inventory';
const CompatibilityRulesEditor = lazy(() =>
  import('@/features/inventory/components/CompatibilityRulesEditor').then((module) => ({
    default: module.CompatibilityRulesEditor,
  })),
);

type EquipmentSummary = {
  id: string;
  name: string;
  manufacturer?: string | null;
  model?: string | null;
};

type InventoryItemDetailDialogsProps = {
  item: InventoryItem;
  itemId: string;
  transactionCount: number;
  isMobile: boolean;
  showEditForm: boolean;
  setShowEditForm: (open: boolean) => void;
  showDeleteConfirmation: boolean;
  setShowDeleteConfirmation: (open: boolean) => void;
  showDeleteDialog: boolean;
  setShowDeleteDialog: (open: boolean) => void;
  showQRCode: boolean;
  setShowQRCode: (open: boolean) => void;
  adjustQuantity: {
    showAdjustDialog: boolean;
    handleAdjustOpenChange: (open: boolean) => void;
    showAddInput: boolean;
    showSubtractInput: boolean;
    adjustmentAmount: number;
    setAdjustmentAmount: (value: number) => void;
    adjustReason: string;
    setAdjustReason: (value: string) => void;
    handleQuickAdd: () => void;
    handleQuickTake: () => void;
    handleShowAddMore: () => void;
    handleShowTakeMore: () => void;
    handleCancelInput: () => void;
    handleSubmitMore: () => void;
    adjustMutationPending: boolean;
  };
  equipmentDialog: {
    showAddEquipmentDialog: boolean;
    setShowAddEquipmentDialog: (open: boolean) => void;
    equipmentSearch: string;
    setEquipmentSearch: (value: string) => void;
    selectedEquipmentIds: string[];
    handleSaveEquipmentCompatibility: () => Promise<void>;
    handleEquipmentToggle: (equipmentId: string, checked: boolean) => void;
    bulkLinkPending: boolean;
  };
  allEquipment: EquipmentSummary[];
  showEditRules: boolean;
  setShowEditRules: (open: boolean) => void;
  editingRules: PartCompatibilityRuleFormData[];
  setEditingRules: (rules: PartCompatibilityRuleFormData[]) => void;
  bulkSetRulesPending: boolean;
  onSaveCompatibilityRules: () => Promise<void>;
  alternateGroups: {
    showCreateGroupDialog: boolean;
    setShowCreateGroupDialog: (open: boolean) => void;
    showAddToGroupDialog: boolean;
    setShowAddToGroupDialog: (open: boolean) => void;
    newGroupName: string;
    setNewGroupName: (value: string) => void;
    selectedGroupId: string | null;
    setSelectedGroupId: (value: string | null) => void;
    groupSearch: string;
    setGroupSearch: (value: string) => void;
    filteredGroups: PartAlternateGroup[];
    availableGroupsCount: number;
    handleCreateGroupWithItem: () => Promise<void>;
    handleAddToGroup: () => Promise<void>;
    createGroupPending: boolean;
    addToGroupPending: boolean;
  };
  onDelete: () => Promise<void>;
};

export function InventoryItemDetailDialogs({
  item,
  itemId,
  transactionCount,
  isMobile,
  showEditForm,
  setShowEditForm,
  showDeleteConfirmation,
  setShowDeleteConfirmation,
  showDeleteDialog,
  setShowDeleteDialog,
  showQRCode,
  setShowQRCode,
  adjustQuantity,
  equipmentDialog,
  allEquipment,
  showEditRules,
  setShowEditRules,
  editingRules,
  setEditingRules,
  bulkSetRulesPending,
  onSaveCompatibilityRules,
  alternateGroups,
  onDelete,
}: InventoryItemDetailDialogsProps) {
  const outlineSecondaryClass = isMobile ? 'border-2 border-input bg-muted/25 hover:bg-muted/40' : '';
  const filteredEquipment = allEquipment.filter(
    (equipment) =>
      equipment.name.toLowerCase().includes(equipmentDialog.equipmentSearch.toLowerCase()) ||
      (equipment.manufacturer ?? '').toLowerCase().includes(equipmentDialog.equipmentSearch.toLowerCase()) ||
      (equipment.model ?? '').toLowerCase().includes(equipmentDialog.equipmentSearch.toLowerCase()),
  );

  return (
    <>
      {showEditForm && (
        <InventoryItemForm
          open={showEditForm}
          onClose={() => setShowEditForm(false)}
          editingItem={item}
        />
      )}

      <Dialog open={showDeleteConfirmation} onOpenChange={setShowDeleteConfirmation}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Inventory Item</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{item.name}"? This will permanently delete the item and all its transaction history. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowDeleteConfirmation(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setShowDeleteConfirmation(false);
                setShowDeleteDialog(true);
              }}
            >
              Continue
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Final Confirmation</DialogTitle>
            <DialogDescription>
              This will permanently delete "{item.name}" and all {transactionCount} transaction record{transactionCount !== 1 ? 's' : ''}. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteDialog(false);
                setShowDeleteConfirmation(false);
              }}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => void onDelete()}>
              Delete Permanently
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <InventoryQRCodeDisplay
        open={showQRCode}
        onClose={() => setShowQRCode(false)}
        itemId={itemId}
        itemName={item.name}
      />

      <InventoryItemAdjustQuantityDialog
        isMobile={isMobile}
        open={adjustQuantity.showAdjustDialog}
        onOpenChange={adjustQuantity.handleAdjustOpenChange}
        currentQuantity={item.quantity_on_hand}
        showAddInput={adjustQuantity.showAddInput}
        showSubtractInput={adjustQuantity.showSubtractInput}
        adjustmentAmount={adjustQuantity.adjustmentAmount}
        adjustReason={adjustQuantity.adjustReason}
        isPending={adjustQuantity.adjustMutationPending}
        outlineSecondaryClass={outlineSecondaryClass}
        onAdjustmentAmountChange={adjustQuantity.setAdjustmentAmount}
        onAdjustReasonChange={adjustQuantity.setAdjustReason}
        onQuickAdd={adjustQuantity.handleQuickAdd}
        onQuickTake={adjustQuantity.handleQuickTake}
        onShowAddMore={adjustQuantity.handleShowAddMore}
        onShowTakeMore={adjustQuantity.handleShowTakeMore}
        onCancelInput={adjustQuantity.handleCancelInput}
        onSubmitMore={adjustQuantity.handleSubmitMore}
      />

      <Dialog open={equipmentDialog.showAddEquipmentDialog} onOpenChange={equipmentDialog.setShowAddEquipmentDialog}>
        <DialogContent className="max-w-2xl max-h-[calc(100dvh-2rem)] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Compatible Equipment</DialogTitle>
            <DialogDescription>
              Select equipment that is compatible with this inventory item
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search equipment..."
                value={equipmentDialog.equipmentSearch}
                onChange={(e) => equipmentDialog.setEquipmentSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="border rounded-md p-2 space-y-2 max-h-96 overflow-y-auto">
              {filteredEquipment.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  {allEquipment.length === 0
                    ? 'No equipment available'
                    : 'No equipment found matching your search'}
                </p>
              ) : (
                filteredEquipment.map((equipment) => (
                  <InventoryEquipmentPickerRow
                    key={equipment.id}
                    equipment={equipment}
                    isSelected={equipmentDialog.selectedEquipmentIds.includes(equipment.id)}
                    onToggle={equipmentDialog.handleEquipmentToggle}
                    selectedBadgeLabel="Selected"
                  />
                ))
              )}
            </div>
            <SelectedEquipmentBadgeList
              selectedEquipmentIds={equipmentDialog.selectedEquipmentIds}
              allEquipment={allEquipment}
              onRemove={(id) => equipmentDialog.handleEquipmentToggle(id, false)}
              removeControl="button"
            />
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => equipmentDialog.setShowAddEquipmentDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => void equipmentDialog.handleSaveEquipmentCompatibility()}
                disabled={equipmentDialog.bulkLinkPending}
              >
                {equipmentDialog.bulkLinkPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditRules} onOpenChange={setShowEditRules}>
        <DialogContent className="max-w-2xl max-h-[calc(100dvh-2rem)] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Compatibility Rules</DialogTitle>
            <DialogDescription>
              Define manufacturer and model patterns to automatically match this part with compatible equipment.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {showEditRules && (
              <Suspense fallback={<Skeleton className="h-32 w-full" />}>
                <CompatibilityRulesEditor
                  rules={editingRules}
                  onChange={setEditingRules}
                  disabled={bulkSetRulesPending}
                />
              </Suspense>
            )}
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowEditRules(false)} disabled={bulkSetRulesPending}>
                Cancel
              </Button>
              <Button onClick={() => void onSaveCompatibilityRules()} disabled={bulkSetRulesPending}>
                {bulkSetRulesPending ? 'Saving...' : 'Save Rules'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={alternateGroups.showCreateGroupDialog} onOpenChange={alternateGroups.setShowCreateGroupDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Alternate Group</DialogTitle>
            <DialogDescription>
              Create a new alternate group with this item as the first member.
              Other interchangeable parts can be added later.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="group-name">
                Group Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="group-name"
                placeholder="e.g., Oil Filter - CAT D6T Compatible"
                value={alternateGroups.newGroupName}
                onChange={(e) => alternateGroups.setNewGroupName(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                A descriptive name for this group of interchangeable parts.
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  alternateGroups.setShowCreateGroupDialog(false);
                  alternateGroups.setNewGroupName('');
                }}
                disabled={alternateGroups.createGroupPending || alternateGroups.addToGroupPending}
              >
                Cancel
              </Button>
              <Button
                onClick={() => void alternateGroups.handleCreateGroupWithItem()}
                disabled={
                  !alternateGroups.newGroupName.trim() ||
                  alternateGroups.createGroupPending ||
                  alternateGroups.addToGroupPending
                }
              >
                {alternateGroups.createGroupPending || alternateGroups.addToGroupPending
                  ? 'Creating...'
                  : 'Create Group'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={alternateGroups.showAddToGroupDialog} onOpenChange={alternateGroups.setShowAddToGroupDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add to Alternate Group</DialogTitle>
            <DialogDescription>
              Select an existing alternate group to add this item to.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search groups..."
                value={alternateGroups.groupSearch}
                onChange={(e) => alternateGroups.setGroupSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="max-h-60 overflow-y-auto border rounded-md p-2 space-y-1">
              {alternateGroups.filteredGroups.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {alternateGroups.availableGroupsCount === 0
                    ? 'No available groups. Create a new one instead.'
                    : 'No groups found matching your search'}
                </p>
              ) : (
                alternateGroups.filteredGroups.map((group) => (
                  <div
                    key={group.id}
                    className={`p-3 rounded cursor-pointer hover:bg-muted/50 ${
                      alternateGroups.selectedGroupId === group.id
                        ? 'bg-primary/10 border border-primary'
                        : 'border border-transparent'
                    }`}
                    onClick={() => alternateGroups.setSelectedGroupId(group.id)}
                  >
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{group.name}</p>
                      {group.status === 'verified' && (
                        <Badge className="bg-success text-xs">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Verified
                        </Badge>
                      )}
                    </div>
                    {group.description && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {group.description}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  alternateGroups.setShowAddToGroupDialog(false);
                  alternateGroups.setSelectedGroupId(null);
                  alternateGroups.setGroupSearch('');
                }}
                disabled={alternateGroups.addToGroupPending}
              >
                Cancel
              </Button>
              <Button
                onClick={() => void alternateGroups.handleAddToGroup()}
                disabled={!alternateGroups.selectedGroupId || alternateGroups.addToGroupPending}
              >
                {alternateGroups.addToGroupPending ? 'Adding...' : 'Add to Group'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
