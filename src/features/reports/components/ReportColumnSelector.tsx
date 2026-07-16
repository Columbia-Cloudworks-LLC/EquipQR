import React, { useMemo } from 'react';
import { ExportCollapsibleCheckboxPicker } from '@/components/common/ExportCollapsibleCheckboxPicker';
import { getColumnsForReportType } from '@/features/reports/constants/reportColumns';
import type { ReportType } from '@/features/reports/types/reports';

interface ReportColumnSelectorProps {
  reportType: ReportType;
  selectedColumns: string[];
  onChange: (columns: string[]) => void;
  className?: string;
}

/**
 * Collapsible column picker for CSV export cards on the Reports page.
 * Collapsed by default; default columns selected on first load.
 */
export const ReportColumnSelector: React.FC<ReportColumnSelectorProps> = ({
  reportType,
  selectedColumns,
  onChange,
  className,
}) => {
  const items = useMemo(
    () =>
      getColumnsForReportType(reportType).map((column) => ({
        key: column.key,
        label: column.label,
      })),
    [reportType],
  );

  return (
    <ExportCollapsibleCheckboxPicker
      title="Fields to export"
      items={items}
      selectedKeys={selectedColumns}
      onChange={onChange}
      noneSelectedMessage="Select at least one field to export."
      idPrefix={`column-${reportType}`}
      className={className}
    />
  );
};
