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
import { useFormatTimestamp } from '@/hooks/useFormatTimestamp';
import { arrayToCsv, downloadCsv, downloadJson, filenameWithDate } from '@/utils/exportUtils';
import type { InventoryItem } from '@/features/inventory/types/inventory';

interface InventoryDownloadMenuProps {
  canExport: boolean;
  items: InventoryItem[];
}

const CSV_HEADERS = [
  'Name',
  'SKU',
  'External ID',
  'Quantity',
  'Low Stock Threshold',
  'Location',
  'Unit Cost',
  'Status',
  'Description',
  'Created At',
];

function itemsToCsvRows(
  items: InventoryItem[],
  formatDate: (date: Date | string) => string
): string[][] {
  return items.map((item) => [
    item.name ?? '',
    item.sku ?? '',
    item.external_id ?? '',
    item.quantity_on_hand != null ? String(item.quantity_on_hand) : '',
    item.low_stock_threshold != null ? String(item.low_stock_threshold) : '',
    item.location ?? '',
    item.default_unit_cost != null ? String(item.default_unit_cost) : '',
    item.isLowStock ? 'Low Stock' : 'OK',
    item.description ?? '',
    item.created_at ? formatDate(item.created_at) : '',
  ]);
}

const InventoryDownloadMenu: React.FC<InventoryDownloadMenuProps> = ({
  canExport,
  items,
}) => {
  const { formatDate } = useFormatTimestamp();

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

  const handleExportCsv = () => {
    const rows = itemsToCsvRows(items, formatDate);
    const csv = arrayToCsv(CSV_HEADERS, rows);
    downloadCsv(csv, filenameWithDate('inventory', 'csv'));
  };

  const handleExportJson = () => {
    const data = items.map((item) => ({
      id: item.id,
      name: item.name,
      sku: item.sku,
      external_id: item.external_id,
      quantity_on_hand: item.quantity_on_hand,
      low_stock_threshold: item.low_stock_threshold,
      location: item.location,
      default_unit_cost: item.default_unit_cost,
      description: item.description,
      is_low_stock: item.isLowStock ?? false,
      created_at: item.created_at,
      updated_at: item.updated_at,
    }));
    downloadJson(data, filenameWithDate('inventory', 'json'));
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
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
          Export format
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <ExportFormatMenuItems
          onExportCsv={handleExportCsv}
          onExportJson={handleExportJson}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default InventoryDownloadMenu;