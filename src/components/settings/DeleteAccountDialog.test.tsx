import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@vitest-harness/utils/test-utils';
import userEvent from '@testing-library/user-event';
import { DeleteAccountDialog } from '@/components/settings/DeleteAccountDialog';

const previewMock = vi.fn();
const executeMock = vi.fn();
const manualReviewMock = vi.fn();

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 'user-1', email: 'User@Example.com' },
    signOut: vi.fn(),
  })),
}));

vi.mock('@/hooks/useAppToast', () => ({
  useAppToast: vi.fn(() => ({
    success: vi.fn(),
    error: vi.fn(),
  })),
}));

vi.mock('@/hooks/useAccountDeletion', () => ({
  useAccountDeletionPreview: () => previewMock(),
  useExecuteAccountDeletion: () => ({ mutateAsync: executeMock, isPending: false }),
  useRequestManualDeletionReview: () => ({ mutateAsync: manualReviewMock, isPending: false }),
}));

vi.mock('@/services/authSessionService', () => ({
  signOutGlobally: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

describe('DeleteAccountDialog', () => {
  beforeEach(() => {
    previewMock.mockReset();
    executeMock.mockReset();
    manualReviewMock.mockReset();
  });

  it('shows blockers and manual review action when preview is blocked', async () => {
    previewMock.mockReturnValue({
      data: {
        eligible_for_self_service: false,
        blockers: [
          {
            code: 'sole_owner_of_shared_org',
            message: 'Transfer organization ownership before deleting your account.',
          },
        ],
      },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    render(<DeleteAccountDialog open onOpenChange={vi.fn()} />);

    expect(
      await screen.findByText('Transfer organization ownership before deleting your account.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Request manual review' })).toBeInTheDocument();
  });

  it('requires confirmation phrase before enabling delete', async () => {
    previewMock.mockReturnValue({
      data: {
        eligible_for_self_service: true,
        blockers: [],
      },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    render(<DeleteAccountDialog open onOpenChange={vi.fn()} />);

    const deleteButton = await screen.findByRole('button', { name: 'Delete my account' });
    expect(deleteButton).toBeDisabled();

    await userEvent.type(
      screen.getByLabelText('Confirmation phrase'),
      'DELETE MY ACCOUNT',
    );

    await waitFor(() => {
      expect(deleteButton).toBeEnabled();
    });
  });
});
