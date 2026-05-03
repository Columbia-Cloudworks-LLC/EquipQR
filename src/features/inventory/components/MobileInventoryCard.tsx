import React from 'react';
import {
  MoreVertical,
  MapPin,
  Eye,
  QrCode,
  Pencil,
  Plus,
  Minus,
  Layers,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { InventoryItem } from '@/features/inventory/types/inventory';
import { getStockHealthListBadgeClassName } from '@/features/inventory/utils/stockHealth';
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

export interface MobileInventoryCardProps {
  item: InventoryItem;
  canCreate: boolean;
  adjustPending: boolean;
  onOpen: (itemId: string) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLElement>, itemId: string) => void;
  onQuickAdjust: (itemId: string, delta: 1 | -1) => void;
  onShowQR: (item: InventoryItem) => void;
  onEdit: (item: InventoryItem) => void;
  groupCount?: number;
  onManageGroups?: (itemId: string) => void;
}

const MobileInventoryCard: React.FC<MobileInventoryCardProps> = ({
  item,
  canCreate,
  adjustPending,
  onOpen,
  onKeyDown,
  onQuickAdjust,
  onShowQR,
  onEdit,
  groupCount = 0,
  onManageGroups,
}) => {
  const stockBadge = getStockHealthListBadgeClassName(item);
  const shouldShowStockBadge = item.isLowStock ?? item.quantity_on_hand <= item.low_stock_threshold;

  return (
    <Card
      className={cn(
        'cursor-pointer border-border/60 bg-card shadow-sm',
        'transition-colors duration-100',
        'hover:bg-muted/40 active:bg-muted/65 dark:active:bg-primary/12',
        'motion-reduce:transition-none'
      )}
      onClick={() => onOpen(item.id)}
      onKeyDown={(e) => onKeyDown(e, item.id)}
      role="button"
      tabIndex={0}
      aria-label={`Open inventory item ${item.name}`}
    >
      <CardContent className="px-4 py-3.5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-2">
            <h3 className="text-base font-semibold leading-snug line-clamp-2 text-foreground">
              {item.name}
            </h3>
            <div className="flex flex-wrap items-end justify-between gap-x-3 gap-y-1">
              <p className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-0.5 text-xs leading-snug text-muted-foreground">
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
                    <span className="text-muted-foreground/40" aria-hidden>·</span>
                    <span className="inline-flex items-center gap-1">
                      <Layers className="h-3 w-3 shrink-0 opacity-80" aria-hidden />
                      {groupCount} group{groupCount > 1 ? 's' : ''}
                    </span>
                  </>
                )}
              </p>
              <div className="flex shrink-0 items-baseline gap-1.5 tabular-nums">
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
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className={cn(
                    'h-11 w-11 min-h-11 min-w-11 shrink-0 touch-manipulation',
                    'border-border/80 bg-background/80 active:scale-[0.97] active:bg-muted',
                    'motion-reduce:active:scale-100'
                  )}
                  aria-label={`More actions for ${item.name}`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                <DropdownMenuItem onClick={() => onOpen(item.id)}>
                  <Eye className="mr-2 h-4 w-4" />
                  View Details
                </DropdownMenuItem>
                {canCreate && (
                  <DropdownMenuItem
                    onClick={() => {
                      void onQuickAdjust(item.id, 1);
                    }}
                    disabled={adjustPending}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add 1
                  </DropdownMenuItem>
                )}
                {canCreate && (
                  <DropdownMenuItem
                    onClick={() => {
                      void onQuickAdjust(item.id, -1);
                    }}
                    disabled={adjustPending}
                  >
                    <Minus className="mr-2 h-4 w-4" />
                    Take 1
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => onShowQR(item)}>
                  <QrCode className="mr-2 h-4 w-4" />
                  QR Code
                </DropdownMenuItem>
                {canCreate && (
                  <DropdownMenuItem onClick={() => onEdit(item)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                )}
                {canCreate && onManageGroups && (
                  <DropdownMenuItem onClick={() => onManageGroups(item.id)}>
                    <Layers className="mr-2 h-4 w-4" />
                    Manage Alternate Groups
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            {shouldShowStockBadge && (
              <Badge
                variant="outline"
                className={cn(
                  'max-w-[11rem] shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold leading-tight',
                  stockBadge.className
                )}
              >
                {stockBadge.label}
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default MobileInventoryCard;
