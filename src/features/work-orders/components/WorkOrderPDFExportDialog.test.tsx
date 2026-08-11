import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen } from '@vitest-harness/utils/test-utils';
import { WorkOrderPDFExportDialog } from './WorkOrderPDFExportDialog';

describe('WorkOrderPDFExportDialog', () => {
  const onOpenChange = vi.fn();
  const onExport = vi.fn().mockResolvedValue(undefined);
  const onSaveToDrive = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows concise action labels and stacks export buttons full width', () => {
    render(
      <WorkOrderPDFExportDialog
        open
        onOpenChange={onOpenChange}
        onExport={onExport}
        isExporting={false}
        isGoogleWorkspaceConnected
        hasOrganizationDriveDestination
        onSaveToDrive={onSaveToDrive}
      />
    );

    expect(screen.getByRole('button', { name: 'Download Service Report PDF' })).toHaveTextContent('Download PDF');
    expect(screen.getByRole('button', { name: 'Save Service Report PDF to organization Drive' })).toHaveTextContent('Save to Drive');
    expect(screen.queryByText(/The PDF will include work order details/i)).not.toBeInTheDocument();
  });

  it('calls download export with includeCosts when checkbox is checked', async () => {
    const user = userEvent.setup();

    render(
      <WorkOrderPDFExportDialog
        open
        onOpenChange={onOpenChange}
        onExport={onExport}
        isExporting={false}
        showCostsOption
      />
    );

    await user.click(screen.getByLabelText('Include itemized costs'));
    await user.click(screen.getByRole('button', { name: 'Download Service Report PDF' }));

    expect(onExport).toHaveBeenCalledWith({ includeCosts: true });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
