import React, { useMemo } from 'react';
import { ExportCollapsibleCheckboxPicker } from '@/components/common/ExportCollapsibleCheckboxPicker';
import {
  ALL_WORKSHEET_KEYS,
  WORKSHEET_NAMES,
  type WorksheetKey,
} from '@/features/work-orders/types/workOrderExcel';

interface WorksheetSelectorProps {
  selectedWorksheets: WorksheetKey[];
  onChange: (worksheets: WorksheetKey[]) => void;
  className?: string;
}

/**
 * Collapsible worksheet picker for the Internal Work Order Packet export card.
 * Collapsed by default; all worksheets selected on first load.
 */
export const WorksheetSelector: React.FC<WorksheetSelectorProps> = ({
  selectedWorksheets,
  onChange,
  className,
}) => {
  const items = useMemo(
    () =>
      ALL_WORKSHEET_KEYS.map((key) => ({
        key,
        label: WORKSHEET_NAMES[key],
      })),
    [],
  );

  return (
    <ExportCollapsibleCheckboxPicker
      title="Worksheets to export"
      items={items}
      selectedKeys={selectedWorksheets}
      onChange={(keys) => onChange(keys as WorksheetKey[])}
      noneSelectedMessage="Select at least one worksheet to export."
      idPrefix="worksheet"
      className={className}
    />
  );
};
