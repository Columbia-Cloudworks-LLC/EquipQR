import type { InventoryItemActionHandlers } from '@/features/inventory/components/InventoryItemActionsMenu';
import MobileInventoryCard from '@/features/inventory/components/MobileInventoryCard';
import type { InventoryItem } from '@/features/inventory/types/inventory';

type InventoryListMobileListProps = InventoryItemActionHandlers & {
  items: InventoryItem[];
  groupMembershipCounts: Record<string, number>;
};

export function InventoryListMobileList({
  items,
  groupMembershipCounts,
  canCreate,
  adjustPending,
  onViewDetails,
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
