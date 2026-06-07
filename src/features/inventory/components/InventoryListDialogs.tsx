import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { InventoryItemForm } from '@/features/inventory/components/InventoryItemForm';
import InventoryQRCodeDisplay from '@/features/inventory/components/InventoryQRCodeDisplay';
import { PartsManagersSheet } from '@/features/inventory/components/PartsManagersSheet';
import type { InventoryItem } from '@/features/inventory/types/inventory';
import { cn } from '@/lib/utils';

type InventoryListDialogsProps = {
  showForm: boolean;
  showManagersSheet: boolean;
  showQRCode: boolean;
  selectedQRCodeItem: InventoryItem | null;
  editingItem: InventoryItem | null;
  isMobile: boolean;
  canCreate: boolean;
  onCloseForm: () => void;
  onCloseQRCode: () => void;
  onManagersSheetOpenChange: (open: boolean) => void;
  onAddItem: () => void;
};

export function InventoryListDialogs({
  showForm,
  showManagersSheet,
  showQRCode,
  selectedQRCodeItem,
  editingItem,
  isMobile,
  canCreate,
  onCloseForm,
  onCloseQRCode,
  onManagersSheetOpenChange,
  onAddItem,
}: InventoryListDialogsProps) {
  return (
    <>
      {showForm && (
        <InventoryItemForm
          open={showForm}
          onClose={onCloseForm}
          editingItem={editingItem}
        />
      )}

      {selectedQRCodeItem && (
        <InventoryQRCodeDisplay
          open={showQRCode}
          onClose={onCloseQRCode}
          itemId={selectedQRCodeItem.id}
          itemName={selectedQRCodeItem.name}
        />
      )}

      <PartsManagersSheet
        open={showManagersSheet}
        onOpenChange={onManagersSheetOpenChange}
      />

      {isMobile && canCreate && (
        <Button
          type="button"
          size="icon"
          onClick={onAddItem}
          aria-label="Add inventory item"
          className={cn(
            'fixed bottom-[78px] right-4 z-fixed h-14 w-14 rounded-full shadow-elevation-3',
            'touch-manipulation transition-transform duration-100 active:scale-[0.97]',
            'motion-reduce:active:scale-100',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
          )}
        >
          <Plus className="h-6 w-6" aria-hidden />
        </Button>
      )}
    </>
  );
}
