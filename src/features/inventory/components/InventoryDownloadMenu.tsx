import React from 'react';
import { FileSpreadsheet, FileJson, ChevronDown } from 'lucide-react';
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

function itemsToCsvRows(items: InventoryItem[]): string[][] {
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
    item.created_at ? new Date(item.created_at).toLocaleDateString() : '',
  ]);
}

const InventoryDownloadMenu: React.FC<InventoryDownloadMenuProps> = ({
  canExport,
  items,
}) => {
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
    const rows = itemsToCsvRows(items);
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
        <DropdownMenuItem
          onClick={handleExportCsv}
          className="gap-2 cursor-pointer"
        >
          <FileSpreadsheet className="h-4 w-4 text-success" />
          <div className="flex flex-col">
            <span className="text-sm">CSV</span>
            <span className="text-[10px] text-muted-foreground">Comma-separated values</span>
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={handleExportJson}
          className="gap-2 cursor-pointer"
        >
          <FileJson className="h-4 w-4 text-info" />
          <div className="flex flex-col">
            <span className="text-sm">JSON</span>
            <span className="text-[10px] text-muted-foreground">Structured data format</span>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default InventoryDownloadMenu;
