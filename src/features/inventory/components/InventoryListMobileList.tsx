import type { InventoryItemActionHandlers } from '@/features/inventory/components/InventoryItemActionsMenu';
import MobileInventoryCard from '@/features/inventory/components/MobileInventoryCard';
import type { InventoryItem } from '@/features/inventory/types/inventory';

type InventoryListMobileListProps = InventoryItemActionHandlers & {
  items: InventoryItem[];
  groupMembershipCounts: Record<string, number>;
  onKeyDown: (e: React.KeyboardEvent<HTMLElement>, itemId: string) => void;
};

export function InventoryListMobileList({
  items,
  groupMembershipCounts,
  canCreate,
  adjustPending,
  onViewDetails,
  onKeyDown,
  onQuickAdjust,
  onShowQR,
  onEdit,
  onManageAlternateGroups,
}: InventoryListMobileListProps) {
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <MobileInventoryCard
          key={item.id}
          item={item}
          canCreate={canCreate}
          adjustPending={adjustPending}
          onViewDetails={onViewDetails}
          onKeyDown={onKeyDown}
          onQuickAdjust={onQuickAdjust}
          onShowQR={onShowQR}
          onEdit={onEdit}
          groupCount={groupMembershipCounts[item.id] ?? 0}
          onManageAlternateGroups={onManageAlternateGroups}
        />
      ))}
    </div>
  );
}
