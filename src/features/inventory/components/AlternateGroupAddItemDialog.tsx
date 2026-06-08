import React from 'react';
import { Search, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { AlternateGroupResponsiveDialog } from '@/features/inventory/components/AlternateGroupResponsiveDialog';
import type { InventoryItem } from '@/features/inventory/types/inventory';

type AlternateGroupAddItemDialogProps = {
  isMobile: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemSearch: string;
  onItemSearchChange: (value: string) => void;
  filteredItems: InventoryItem[];
  availableItemsCount: number;
  selectedItemId: string | null;
  onSelectItem: (itemId: string) => void;
  isPrimaryItem: boolean;
  onPrimaryItemChange: (checked: boolean) => void;
  onCancel: () => void;
  onSubmit: () => void;
  isPending: boolean;
};

function AddItemDialogBody({
  itemSearch,
  onItemSearchChange,
  filteredItems,
  availableItemsCount,
  selectedItemId,
  onSelectItem,
  isPrimaryItem,
  onPrimaryItemChange,
  onCancel,
  onSubmit,
  isPending,
}: Omit<AlternateGroupAddItemDialogProps, 'isMobile' | 'open' | 'onOpenChange'>) {
  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder="Search inventory items..."
          value={itemSearch}
          onChange={(e) => onItemSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="max-h-60 overflow-y-auto border rounded-md p-2 space-y-1">
        {filteredItems.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            {!itemSearch.trim() && availableItemsCount > 0
              ? 'Search to find inventory items to add'
              : availableItemsCount === 0
                ? 'All inventory items are already in this group'
                : 'No items found matching your search'}
          </p>
        ) : (
          filteredItems.map((item) => (
            <div
              key={item.id}
              className={`p-2 rounded cursor-pointer hover:bg-muted/50 transition-colors ${
                selectedItemId === item.id
                  ? 'bg-primary/15 border-2 border-primary ring-2 ring-primary/20'
                  : 'border border-transparent'
              }`}
              onClick={() => onSelectItem(item.id)}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium">{item.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {item.sku && `SKU: ${item.sku} • `}
                    Qty: {item.quantity_on_hand}
                  </p>
                </div>
                {selectedItemId === item.id && (
                  <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="is-primary"
          checked={isPrimaryItem}
          onCheckedChange={(checked) => onPrimaryItemChange(checked as boolean)}
        />
        <Label htmlFor="is-primary" className="text-sm">
          Mark as primary part in this group
        </Label>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={onSubmit} disabled={!selectedItemId || isPending}>
          {isPending ? 'Adding...' : 'Add Item'}
        </Button>
      </div>
    </div>
  );
}

export function AlternateGroupAddItemDialog(props: AlternateGroupAddItemDialogProps) {
  const { isMobile, open, onOpenChange } = props;

  return (
    <AlternateGroupResponsiveDialog
      isMobile={isMobile}
      open={open}
      onOpenChange={onOpenChange}
      title="Add Inventory Item"
      description="Select an inventory item to add to this alternate group."
    >
      <AddItemDialogBody {...props} />
    </AlternateGroupResponsiveDialog>
  );
}
