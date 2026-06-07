import {
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
  Layers,
  MoreVertical,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { InventoryItemActionsMenu } from '@/features/inventory/components/InventoryItemActionsMenu';
import type { InventoryFilters, InventoryItem } from '@/features/inventory/types/inventory';
import { getStockHealthPresentation } from '@/features/inventory/utils/stockHealth';
import { getQuantityClassName } from '@/features/inventory/utils/inventoryListPresentation';
import { cn } from '@/lib/utils';

type InventoryListDesktopTableProps = {
  items: InventoryItem[];
  filters: InventoryFilters;
  groupMembershipCounts: Record<string, number>;
  canCreate: boolean;
  adjustPending: boolean;
  onSortChange: (sortBy: NonNullable<InventoryFilters['sortBy']>) => void;
  onViewItem: (itemId: string) => void;
  onItemKeyDown: (e: React.KeyboardEvent<HTMLElement>, itemId: string) => void;
  onQuickAdjust: (itemId: string, delta: 1 | -1) => void;
  onShowQR: (item: InventoryItem) => void;
  onEditItem: (item: InventoryItem) => void;
  onManageAlternateGroups: (itemId: string) => void;
};

function SortIcon({
  sortBy,
  filters,
}: {
  sortBy: NonNullable<InventoryFilters['sortBy']>;
  filters: InventoryFilters;
}) {
  if (filters.sortBy !== sortBy) {
    return <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />;
  }
  return filters.sortOrder === 'asc'
    ? <ChevronUp className="h-3.5 w-3.5" />
    : <ChevronDown className="h-3.5 w-3.5" />;
}

export function InventoryListDesktopTable({
  items,
  filters,
  groupMembershipCounts,
  canCreate,
  adjustPending,
  onSortChange,
  onViewItem,
  onItemKeyDown,
  onQuickAdjust,
  onShowQR,
  onEditItem,
  onManageAlternateGroups,
}: InventoryListDesktopTableProps) {
  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <Button variant="ghost" className="-ml-3 h-8 px-3" onClick={() => onSortChange('name')}>
                  Name
                  <SortIcon sortBy="name" filters={filters} />
                </Button>
              </TableHead>
              <TableHead>
                <Button variant="ghost" className="-ml-3 h-8 px-3" onClick={() => onSortChange('sku')}>
                  SKU
                  <SortIcon sortBy="sku" filters={filters} />
                </Button>
              </TableHead>
              <TableHead className="hidden xl:table-cell">
                <Button variant="ghost" className="-ml-3 h-8 px-3" onClick={() => onSortChange('external_id')}>
                  External ID
                  <SortIcon sortBy="external_id" filters={filters} />
                </Button>
              </TableHead>
              <TableHead>
                <Button variant="ghost" className="-ml-3 h-8 px-3" onClick={() => onSortChange('quantity_on_hand')}>
                  Quantity
                  <SortIcon sortBy="quantity_on_hand" filters={filters} />
                </Button>
              </TableHead>
              <TableHead>
                <Button variant="ghost" className="-ml-3 h-8 px-3" onClick={() => onSortChange('location')}>
                  Location
                  <SortIcon sortBy="location" filters={filters} />
                </Button>
              </TableHead>
              <TableHead>
                <Button variant="ghost" className="-ml-3 h-8 px-3" onClick={() => onSortChange('status')}>
                  Status
                  <SortIcon sortBy="status" filters={filters} />
                </Button>
              </TableHead>
              <TableHead className="w-[56px]">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => {
              const stockHealth = getStockHealthPresentation(item);
              const stockStatusLabel = stockHealth.label === 'Healthy' ? 'In Stock' : stockHealth.label;
              const groupCount = groupMembershipCounts[item.id] ?? 0;

              return (
                <TableRow
                  key={item.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => onViewItem(item.id)}
                  onKeyDown={(e) => onItemKeyDown(e, item.id)}
                  role="button"
                  tabIndex={0}
                  aria-label={`Open inventory item ${item.name}`}
                >
                  <TableCell className="font-medium">
                    <div className="min-w-0">
                      <p className="truncate">{item.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        SKU: {item.sku || '-'}
                        {item.location ? `  •  ${item.location}` : ''}
                      </p>
                      {groupCount > 0 && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Layers className="h-3 w-3" aria-hidden />
                          Part of {groupCount} alternate group{groupCount > 1 ? 's' : ''}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {item.sku || '-'}
                  </TableCell>
                  <TableCell className="hidden xl:table-cell font-mono text-sm text-muted-foreground">
                    {item.external_id || '-'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className={cn('tabular-nums', getQuantityClassName(item))}>
                        {item.quantity_on_hand}
                      </span>
                      {stockHealth.label !== 'Healthy' && (
                        <Badge
                          variant="outline"
                          className={cn('rounded-full px-2 py-0.5 text-xs font-medium', stockHealth.className)}
                        >
                          {stockHealth.label}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {item.location || '-'}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn('rounded-full px-2 py-0.5 text-xs font-medium', stockHealth.className)}
                    >
                      {stockStatusLabel}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          aria-label={`Actions for ${item.name}`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                        <InventoryItemActionsMenu
                          item={item}
                          canCreate={canCreate}
                          adjustPending={adjustPending}
                          onViewDetails={onViewItem}
                          onQuickAdjust={onQuickAdjust}
                          onShowQR={onShowQR}
                          onEdit={onEditItem}
                          onManageAlternateGroups={onManageAlternateGroups}
                        />
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
