import React from 'react';
import { FileJson, FileSpreadsheet } from 'lucide-react';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';

export interface ExportFormatMenuItemsProps {
  onExportCsv: () => void;
  onExportJson: () => void;
  csvLabel?: string;
  jsonLabel?: string;
  disabled?: boolean;
}

export const ExportFormatMenuItems: React.FC<ExportFormatMenuItemsProps> = ({
  onExportCsv,
  onExportJson,
  csvLabel = 'CSV',
  jsonLabel = 'JSON',
  disabled = false,
}) => (
  <>
    <DropdownMenuItem
      onClick={onExportCsv}
      disabled={disabled}
      className="gap-2 cursor-pointer"
    >
      <FileSpreadsheet className="h-4 w-4 text-success" />
      <div className="flex flex-col">
        <span className="text-sm">{csvLabel}</span>
        <span className="text-[10px] text-muted-foreground">Comma-separated values</span>
      </div>
    </DropdownMenuItem>
    <DropdownMenuItem
      onClick={onExportJson}
      disabled={disabled}
      className="gap-2 cursor-pointer"
    >
      <FileJson className="h-4 w-4 text-info" />
      <div className="flex flex-col">
        <span className="text-sm">{jsonLabel}</span>
        <span className="text-[10px] text-muted-foreground">Structured data format</span>
      </div>
    </DropdownMenuItem>
  </>
);
