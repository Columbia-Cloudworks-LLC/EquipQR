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
import { arrayToCsv, downloadCsv, downloadJson, filenameWithDate } from '@/utils/exportUtils';
import type { PartAlternateGroup } from '@/features/inventory/types/inventory';

interface AlternateGroupsDownloadMenuProps {
  groups: PartAlternateGroup[];
}

const CSV_HEADERS = [
  'Name',
  'Status',
  'Description',
  'Notes',
  'Member Count',
  'Created At',
  'Updated At',
];

function groupsToCsvRows(groups: PartAlternateGroup[]): string[][] {
  return groups.map((g) => [
    g.name ?? '',
    g.status ?? '',
    g.description ?? '',
    g.notes ?? '',
    g.member_count != null ? String(g.member_count) : '',
    g.created_at ? new Date(g.created_at).toLocaleDateString() : '',
    g.updated_at ? new Date(g.updated_at).toLocaleDateString() : '',
  ]);
}

const AlternateGroupsDownloadMenu: React.FC<AlternateGroupsDownloadMenuProps> = ({ groups }) => {
  const handleExportCsv = () => {
    const rows = groupsToCsvRows(groups);
    const csv = arrayToCsv(CSV_HEADERS, rows);
    downloadCsv(csv, filenameWithDate('alternate-groups', 'csv'));
  };

  const handleExportJson = () => {
    const data = groups.map((g) => ({
      id: g.id,
      name: g.name,
      status: g.status,
      description: g.description,
      notes: g.notes,
      evidence_url: g.evidence_url,
      member_count: g.member_count,
      verified_by: g.verified_by,
      verified_at: g.verified_at,
      created_at: g.created_at,
      updated_at: g.updated_at,
    }));
    downloadJson(data, filenameWithDate('alternate-groups', 'json'));
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 text-sm font-normal"
          aria-label="Download alternate groups"
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
        <DropdownMenuItem onClick={handleExportCsv} className="gap-2 cursor-pointer">
          <FileSpreadsheet className="h-4 w-4 text-success" />
          <div className="flex flex-col">
            <span className="text-sm">CSV</span>
            <span className="text-[10px] text-muted-foreground">Comma-separated values</span>
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportJson} className="gap-2 cursor-pointer">
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

export default AlternateGroupsDownloadMenu;
