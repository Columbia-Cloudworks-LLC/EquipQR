import MobileInventoryCard from '@/features/inventory/components/MobileInventoryCard';
import type { InventoryItem } from '@/features/inventory/types/inventory';

type InventoryListMobileListProps = {
  items: InventoryItem[];
  groupMembershipCounts: Record<string, number>;
  canCreate: boolean;
  adjustPending: boolean;
  onOpen: (itemId: string) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLElement>, itemId: string) => void;
  onQuickAdjust: (itemId: string, delta: 1 | -1) => void;
  onShowQR: (item: InventoryItem) => void;
  onEdit: (item: InventoryItem) => void;
  onManageGroups: (itemId: string) => void;
};

export function InventoryListMobileList({
  items,
  groupMembershipCounts,
  canCreate,
  adjustPending,
  onOpen,
  onKeyDown,
  onQuickAdjust,
  onShowQR,
  onEdit,
  onManageGroups,
}: InventoryListMobileListProps) {
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <MobileInventoryCard
          key={item.id}
          item={item}
          canCreate={canCreate}
          adjustPending={adjustPending}
          onOpen={onOpen}
          onKeyDown={onKeyDown}
          onQuickAdjust={onQuickAdjust}
          onShowQR={onShowQR}
          onEdit={onEdit}
          groupCount={groupMembershipCounts[item.id] ?? 0}
          onManageGroups={onManageGroups}
        />
      ))}
    </div>
  );
}
