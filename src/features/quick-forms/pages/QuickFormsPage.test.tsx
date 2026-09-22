import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestQueryClient } from '@vitest-harness/utils/query-client-wrapper';
import QuickFormsPage from '@/features/quick-forms/pages/QuickFormsPage';
import { quickFormKeys } from '@/features/quick-forms/hooks/quickFormKeys';
import type { QuickForm } from '@/features/quick-forms/services/quickFormsService';

const listQuickForms = vi.hoisted(() => vi.fn());

vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: () => ({
    hasRole: () => true,
  }),
}));

vi.mock('@/hooks/useSimpleOrganization', () => ({
  useSimpleOrganization: () => ({
    currentOrganization: { id: 'org-1', name: 'Apex Construction' },
  }),
}));

vi.mock('@/features/quick-forms/services/quickFormsService', () => ({
  listQuickForms: (...args: unknown[]) => listQuickForms(...args),
  createQuickForm: vi.fn(),
  updateQuickForm: vi.fn(),
  deleteQuickForm: vi.fn(),
  rotateQuickFormToken: vi.fn(),
}));

vi.mock('@/features/quick-forms/services/quickFormSubmissionsService', () => ({
  listQuickFormSubmissionPage: vi.fn(),
  listAllQuickFormSubmissions: vi.fn(),
}));

const form: QuickForm = {
  id: 'form-1',
  organization_id: 'org-1',
  name: 'Time sheet',
  description: null,
  form_data: { fields: [] },
  is_active: true,
  public_token_hash: 'hash',
  token_rotated_at: '2026-09-01T00:00:00.000Z',
  token_rotated_by: null,
  created_by: 'user-1',
  updated_by: null,
  created_at: '2026-09-01T00:00:00.000Z',
  updated_at: '2026-09-01T00:00:00.000Z',
};

function renderPage() {
  const client = createTestQueryClient();
  const view = render(
    <QueryClientProvider client={client}>
      <QuickFormsPage />
    </QueryClientProvider>,
  );
  return { client, ...view };
}

describe('Quick Forms request states', () => {
  beforeEach(() => {
    listQuickForms.mockReset();
  });

  it('shows a retryable error when the first forms request fails', async () => {
    listQuickForms.mockRejectedValue(new Error('HTTP 500'));
    renderPage();

    expect(await screen.findByRole('alert')).toHaveTextContent(/couldn't load quick forms/i);
    expect(screen.queryByText('No quick forms yet')).not.toBeInTheDocument();
    expect(listQuickForms).toHaveBeenCalledWith('org-1');
  });

  it('shows the empty state only after a successful request with no forms', async () => {
    listQuickForms.mockResolvedValue([]);
    renderPage();

    expect(await screen.findByText('No quick forms yet')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('recovers from a failed load when retry succeeds', async () => {
    const user = userEvent.setup({ delay: null });
    listQuickForms.mockRejectedValueOnce(new Error('HTTP 500'));
    listQuickForms.mockResolvedValueOnce([]);
    renderPage();

    await user.click(await screen.findByRole('button', { name: /try again/i }));
    expect(await screen.findByText('No quick forms yet')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('keeps loaded forms on screen when a later refresh fails', async () => {
    listQuickForms.mockResolvedValue([form]);
    const { client } = renderPage();

    expect(await screen.findByText('Time sheet')).toBeInTheDocument();
    listQuickForms.mockRejectedValue(new Error('HTTP 500'));
    await client.invalidateQueries({ queryKey: quickFormKeys.list('org-1') });

    expect(await screen.findByRole('alert')).toHaveTextContent(/latest refresh failed/i);
    expect(screen.getByText('Time sheet')).toBeInTheDocument();
    expect(screen.queryByText('No quick forms yet')).not.toBeInTheDocument();
    await waitFor(() => {
      expect(listQuickForms.mock.calls.length).toBeGreaterThan(1);
    });
  });

  it('shows a refresh failure when the cached result is an empty list', async () => {
    listQuickForms.mockResolvedValue([]);
    const { client } = renderPage();

    expect(await screen.findByText('No quick forms yet')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    listQuickForms.mockRejectedValue(new Error('HTTP 500'));
    await client.invalidateQueries({ queryKey: quickFormKeys.list('org-1') });

    expect(await screen.findByRole('alert')).toHaveTextContent(/latest refresh failed/i);
    expect(screen.getByText('No quick forms yet')).toBeInTheDocument();
    expect(screen.queryByText(/couldn't load quick forms/i)).not.toBeInTheDocument();
  });
});
