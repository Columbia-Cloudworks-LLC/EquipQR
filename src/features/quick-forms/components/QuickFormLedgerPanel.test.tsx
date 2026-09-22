import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestQueryClient } from '@vitest-harness/utils/query-client-wrapper';
import { QuickFormLedgerPanel } from '@/features/quick-forms/components/QuickFormLedgerPanel';
import type { QuickForm } from '@/features/quick-forms/services/quickFormsService';
import type {
  QuickFormSubmission,
  QuickFormSubmissionPage,
} from '@/features/quick-forms/services/quickFormSubmissionsService';

const listQuickFormSubmissionPage = vi.hoisted(() => vi.fn());
const listAllQuickFormSubmissions = vi.hoisted(() => vi.fn());
const downloadCsv = vi.hoisted(() => vi.fn());
const downloadExcel = vi.hoisted(() => vi.fn());
const downloadPdf = vi.hoisted(() => vi.fn());

vi.mock('@/features/quick-forms/services/quickFormSubmissionsService', () => ({
  QUICK_FORM_LEDGER_PAGE_SIZE: 100,
  QUICK_FORM_EXPORT_PAGE_SIZE: 1000,
  listQuickFormSubmissionPage: (...args: unknown[]) => listQuickFormSubmissionPage(...args),
  listAllQuickFormSubmissions: (...args: unknown[]) => listAllQuickFormSubmissions(...args),
}));

vi.mock('@/features/quick-forms/services/quickFormExportService', () => ({
  downloadQuickFormSubmissionsCsv: (...args: unknown[]) => downloadCsv(...args),
  downloadQuickFormSubmissionsExcel: (...args: unknown[]) => downloadExcel(...args),
  downloadQuickFormSubmissionsPdf: (...args: unknown[]) => downloadPdf(...args),
}));

const forms = [{ id: 'form-1', name: 'Time sheet' } as QuickForm];

function submission(id: string): QuickFormSubmission {
  return {
    id,
    organization_id: 'org-1',
    quick_form_id: 'form-1',
    submitted_at: '2026-09-21T15:04:05.000Z',
    form_snapshot: { name: 'Time sheet', fields: [] },
    field_values: [{ field_id: 'name', label: 'Name', input_type: 'text', value: id }],
    client_context: null,
    request_fingerprint: null,
    created_at: '2026-09-21T15:04:05.000Z',
  };
}

function page(ids: string[], totalCount: number, nextCursor: QuickFormSubmissionPage['nextCursor']): QuickFormSubmissionPage {
  return {
    submissions: ids.map(submission),
    totalCount,
    nextCursor,
  };
}

function renderLedger() {
  const client = createTestQueryClient();
  const view = render(
    <QueryClientProvider client={client}>
      <QuickFormLedgerPanel organizationId="org-1" forms={forms} />
    </QueryClientProvider>,
  );
  return { client, ...view };
}

describe('Quick form ledger states and export scope', () => {
  beforeEach(() => {
    listQuickFormSubmissionPage.mockReset();
    listAllQuickFormSubmissions.mockReset();
    downloadCsv.mockReset();
    downloadExcel.mockReset();
    downloadPdf.mockReset();
  });

  it('shows a retryable error when the first ledger request fails', async () => {
    listQuickFormSubmissionPage.mockRejectedValue(new Error('HTTP 500'));
    renderLedger();

    expect(await screen.findByRole('alert')).toHaveTextContent(/couldn't load submissions/i);
    expect(screen.queryByText('No submissions yet')).not.toBeInTheDocument();
  });

  it('shows the empty state only after a successful request with no rows', async () => {
    listQuickFormSubmissionPage.mockResolvedValue(page([], 0, null));
    renderLedger();

    expect(await screen.findByText('No submissions yet')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /export/i })).toBeDisabled();
  });

  it('loads another page and exports the full match set rather than the visible page', async () => {
    const user = userEvent.setup({ delay: null });
    const visible = submission('visible');
    const hidden = submission('hidden');
    listQuickFormSubmissionPage
      .mockResolvedValueOnce(page(['visible'], 2, { submittedAt: visible.submitted_at, id: visible.id }))
      .mockResolvedValueOnce(page(['hidden'], 2, null));
    listAllQuickFormSubmissions.mockResolvedValue([visible, hidden]);
    renderLedger();

    expect(await screen.findByTestId('quick-form-ledger-count')).toHaveTextContent('Showing 1 of 2 submissions');
    expect(screen.getByText(/Name: visible/)).toBeInTheDocument();
    expect(screen.queryByText(/Name: hidden/)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /load more/i }));
    expect(await screen.findByText(/Name: hidden/)).toBeInTheDocument();
    expect(screen.getByTestId('quick-form-ledger-count')).toHaveTextContent('Showing 2 of 2 submissions');

    await user.click(screen.getByRole('button', { name: /^export$/i }));
    await user.click(await screen.findByRole('menuitem', { name: /csv/i }));

    expect(listAllQuickFormSubmissions).toHaveBeenCalledWith('org-1', expect.objectContaining({
      quickFormId: undefined,
    }));
    expect(downloadCsv).toHaveBeenCalledWith([visible, hidden]);
  });

  it('keeps loaded rows when a background refresh fails', async () => {
    listQuickFormSubmissionPage.mockResolvedValue(page(['visible'], 1, null));
    const { client } = renderLedger();
    expect(await screen.findByText(/Name: visible/)).toBeInTheDocument();

    listQuickFormSubmissionPage.mockRejectedValue(new Error('HTTP 500'));
    await client.invalidateQueries();

    expect(await screen.findByRole('alert')).toHaveTextContent(/last loaded submissions/i);
    expect(screen.getByText(/Name: visible/)).toBeInTheDocument();
    expect(screen.queryByText('No submissions yet')).not.toBeInTheDocument();
  });
});
