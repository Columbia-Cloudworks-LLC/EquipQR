import React from 'react';
import {
  MoreVertical,
  MapPin,
  Layers,
  QrCode,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  InventoryItemActionsMenu,
  type InventoryItemActionHandlers,
} from '@/features/inventory/components/InventoryItemActionsMenu';
import { InventoryStockBar } from '@/features/inventory/components/InventoryStockBar';
import type { InventoryItem } from '@/features/inventory/types/inventory';
import { cn } from '@/lib/utils';

/** Quantity display: out of stock vs low-but-available vs healthy. */
function getQuantityClassName(item: InventoryItem): string {
  const isLowStock = item.isLowStock ?? item.quantity_on_hand <= item.low_stock_threshold;
  if (item.quantity_on_hand <= 0) {
    return 'text-destructive';
  }
  if (isLowStock) {
    return 'text-warning';
  }
  return 'text-foreground';
}

export interface MobileInventoryCardProps extends InventoryItemActionHandlers {
  item: InventoryItem;
  onKeyDown: (e: React.KeyboardEvent<HTMLElement>, itemId: string) => void;
  groupCount?: number;
}

const MobileInventoryCard: React.FC<MobileInventoryCardProps> = ({
  item,
  canCreate,
  adjustPending,
  onViewDetails,
  onKeyDown,
  onQuickAdjust,
  onShowQR,
  onEdit,
  onManageAlternateGroups,
  groupCount = 0,
}) => {
  const handleQRClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onShowQR(item);
  };

  return (
    <Card
      className={cn(
        'cursor-pointer border-border/60 bg-card shadow-sm',
        'transition-colors duration-100',
        'hover:bg-muted/40 active:bg-muted/65 dark:active:bg-primary/12',
        'motion-reduce:transition-none'
      )}
      onClick={() => onViewDetails(item.id)}
      onKeyDown={(e) => onKeyDown(e, item.id)}
      role="button"
      tabIndex={0}
      aria-label={`Open inventory item ${item.name}`}
    >
      <CardContent className="px-3 py-3">
        <div className="grid min-w-0 grid-cols-[1fr_auto] gap-x-2.5 gap-y-1">
          <div className="col-start-1 row-start-1 min-w-0">
            <h3 className="line-clamp-2 text-base font-semibold leading-snug text-foreground">
              {item.name}
            </h3>
          </div>

          <div className="col-start-2 row-start-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 -mr-1 text-muted-foreground hover:text-foreground"
              onClick={handleQRClick}
              aria-label={`Show QR code for ${item.name}`}
            >
              <QrCode className="h-4 w-4" aria-hidden />
            </Button>
          </div>

          <div className="col-start-1 col-span-2 row-start-2 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-xs leading-snug text-muted-foreground">
            <span className="shrink-0 text-muted-foreground/90">SKU: {item.sku || '—'}</span>
            {item.location ? (
              <>
                <span className="text-muted-foreground/40" aria-hidden>
                  ·
                </span>
                <span className="inline-flex min-w-0 items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
                  <span className="truncate">{item.location}</span>
                </span>
              </>
            ) : null}
            {groupCount > 0 && (
              <>
                <span className="text-muted-foreground/40" aria-hidden>
                  ·
                </span>
                <span className="inline-flex items-center gap-1">
                  <Layers className="h-3 w-3 shrink-0 opacity-80" aria-hidden />
                  {groupCount} group{groupCount > 1 ? 's' : ''}
                </span>
              </>
            )}
          </div>

          <div className="col-start-1 row-start-3 min-w-0 space-y-1.5 pt-0.5">
            <div className="flex items-baseline gap-1.5 tabular-nums">
              <span
                className={cn(
                  'text-2xl font-bold leading-none tracking-tight',
                  getQuantityClassName(item)
                )}
              >
                {item.quantity_on_hand}
              </span>
              <span className="pb-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                on hand
              </span>
            </div>
            <InventoryStockBar
              quantityOnHand={item.quantity_on_hand}
              lowStockThreshold={item.low_stock_threshold}
            />
          </div>

          <div className="col-start-2 row-start-3 self-end">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
                  aria-label={`More actions for ${item.name}`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="h-4 w-4" aria-hidden />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                <InventoryItemActionsMenu
                  item={item}
                  canCreate={canCreate}
                  adjustPending={adjustPending}
                  onViewDetails={onViewDetails}
                  onQuickAdjust={onQuickAdjust}
                  onShowQR={onShowQR}
                  onEdit={onEdit}
                  onManageAlternateGroups={onManageAlternateGroups}
                />
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default MobileInventoryCard;
