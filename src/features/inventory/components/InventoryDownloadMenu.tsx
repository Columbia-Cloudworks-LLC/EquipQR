import React from 'react';
import { ChevronDown } from 'lucide-react';
import { ExportFormatMenuItems } from '@/components/common/ExportFormatMenuItems';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { InventoryTableColumnKey } from '@/features/inventory/components/inventoryTableColumns';
import type { InventoryItem } from '@/features/inventory/types/inventory';
import {
  getAllExportHeaders,
  getVisibleExportHeaders,
  itemsToAllExportRows,
  itemsToJsonExport,
  itemsToVisibleExportRows,
} from '@/features/inventory/utils/inventoryExportUtils';
import { useFormatTimestamp } from '@/hooks/useFormatTimestamp';
import { arrayToCsv, downloadCsv, downloadJson, filenameWithDate } from '@/utils/exportUtils';

interface InventoryDownloadMenuProps {
  canExport: boolean;
  items: InventoryItem[];
  visibleColumnKeys?: InventoryTableColumnKey[];
  selectedItems?: InventoryItem[];
}

const InventoryDownloadMenu: React.FC<InventoryDownloadMenuProps> = ({
  canExport,
  items,
  visibleColumnKeys = [],
  selectedItems = [],
}) => {
  const { formatDate } = useFormatTimestamp();
  const hasVisibleColumns = visibleColumnKeys.length > 0;
  const hasSelection = selectedItems.length > 0;

  if (!canExport) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-sm font-normal opacity-50 cursor-not-allowed"
            disabled
          >
            Download
            <ChevronDown className="h-3 w-3 text-muted-foreground" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          Export is available to parts managers, owners, and admins
        </TooltipContent>
      </Tooltip>
    );
  }

  const handleExportAllCsv = () => {
    const rows = itemsToAllExportRows(items, formatDate);
    const csv = arrayToCsv(getAllExportHeaders(), rows);
    downloadCsv(csv, filenameWithDate('inventory', 'csv'));
  };

  const handleExportAllJson = () => {
    downloadJson(itemsToJsonExport(items), filenameWithDate('inventory', 'json'));
  };

  const handleExportVisibleCsv = () => {
    const rows = itemsToVisibleExportRows(items, visibleColumnKeys, formatDate);
    const csv = arrayToCsv(getVisibleExportHeaders(visibleColumnKeys), rows);
    downloadCsv(csv, filenameWithDate('inventory-visible-columns', 'csv'));
  };

  const handleExportVisibleJson = () => {
    const data = itemsToJsonExport(items).map((item) => {
      const filtered: Record<string, unknown> = { id: item.id };
      for (const key of visibleColumnKeys) {
        filtered[key] = item[key as keyof typeof item];
      }
      return filtered;
    });
    downloadJson(data, filenameWithDate('inventory-visible-columns', 'json'));
  };

  const handleExportSelectedCsv = () => {
    const rows = itemsToAllExportRows(selectedItems, formatDate);
    const csv = arrayToCsv(getAllExportHeaders(), rows);
    downloadCsv(csv, filenameWithDate('inventory-selected', 'csv'));
  };

  const handleExportSelectedJson = () => {
    downloadJson(itemsToJsonExport(selectedItems), filenameWithDate('inventory-selected', 'json'));
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 text-sm font-normal"
          aria-label="Download inventory"
        >
          Download
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
          Export all fields
        </DropdownMenuLabel>
        <ExportFormatMenuItems
          onExportCsv={handleExportAllCsv}
          onExportJson={handleExportAllJson}
        />

        {hasVisibleColumns && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
              Export visible columns
            </DropdownMenuLabel>
            <DropdownMenuItem onSelect={handleExportVisibleCsv}>CSV (visible)</DropdownMenuItem>
            <DropdownMenuItem onSelect={handleExportVisibleJson}>JSON (visible)</DropdownMenuItem>
          </>
        )}

        {hasSelection && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
              Export selected ({selectedItems.length})
            </DropdownMenuLabel>
            <DropdownMenuItem onSelect={handleExportSelectedCsv}>CSV (selected)</DropdownMenuItem>
            <DropdownMenuItem onSelect={handleExportSelectedJson}>JSON (selected)</DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default InventoryDownloadMenu;
