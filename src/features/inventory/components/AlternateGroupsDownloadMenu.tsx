import React from 'react';
import { Download } from 'lucide-react';
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
import { useFormatTimestamp } from '@/hooks/useFormatTimestamp';
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

function groupsToCsvRows(
  groups: PartAlternateGroup[],
  formatDate: (date: Date | string) => string
): string[][] {
  return groups.map((g) => [
    g.name ?? '',
    g.status ?? '',
    g.description ?? '',
    g.notes ?? '',
    g.member_count != null ? String(g.member_count) : '',
    g.created_at ? formatDate(g.created_at) : '',
    g.updated_at ? formatDate(g.updated_at) : '',
  ]);
}

const AlternateGroupsDownloadMenu: React.FC<AlternateGroupsDownloadMenuProps> = ({ groups }) => {
  const { formatDate } = useFormatTimestamp();

  const handleExportCsv = () => {
    const rows = groupsToCsvRows(groups, formatDate);
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
          size="icon"
          className="h-8 w-8"
          aria-label="Download alternate groups"
        >
          <Download className="h-3.5 w-3.5" />
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

export default AlternateGroupsDownloadMenu;