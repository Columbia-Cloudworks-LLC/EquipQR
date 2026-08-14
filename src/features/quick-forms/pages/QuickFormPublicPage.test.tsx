import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@vitest-harness/utils/test-utils';
import userEvent from '@testing-library/user-event';
import QuickFormPublicPage from '@/features/quick-forms/pages/QuickFormPublicPage';

const TEST_TOKEN = 'a'.repeat(64);

const mockLoadQuickForm = vi.fn();
const mockSubmitQuickForm = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ token: TEST_TOKEN }),
  };
});

vi.mock('@/features/quick-forms/services/quickFormPublicService', () => ({
  loadQuickForm: (...args: unknown[]) => mockLoadQuickForm(...args),
  submitQuickForm: (...args: unknown[]) => mockSubmitQuickForm(...args),
}));

vi.mock('@/components/seo/PageSEO', () => ({
  PageSEO: () => null,
}));

vi.mock('@/components/ui/HCaptcha', () => ({
  default: ({
    onSuccess,
  }: {
    onSuccess?: (token: string) => void;
  }) => (
    <button type="button" data-testid="hcaptcha-success" onClick={() => onSuccess?.('mock-captcha-token')}>
      Verify Captcha
    </button>
  ),
}));

vi.mock('sonner', () => ({
  toast: { error: vi.fn() },
}));

describe('QuickFormPublicPage captcha wiring', () => {
  beforeEach(() => {
    mockLoadQuickForm.mockReset();
    mockSubmitQuickForm.mockReset();
    vi.stubEnv('VITE_HCAPTCHA_SITEKEY', '10000000-ffff-ffff-ffff-000000000001');
    mockLoadQuickForm.mockResolvedValue({
      form: {
        id: 'form-1',
        name: 'RT-03 Throttle Guard',
        description: null,
        organizationName: 'Apex Construction Company',
        fields: [{ id: 'field-note', label: 'Site note', inputType: 'text', required: true }],
        collectLocation: false,
      },
      captchaRequired: true,
    });
    mockSubmitQuickForm.mockResolvedValue({
      success: true,
      submissionId: 'sub-1',
      submittedAt: '2026-08-14T12:00:00.000Z',
    });
  });

  it('keeps submit disabled until captcha onSuccess provides a token', async () => {
    const user = userEvent.setup();
    render(<QuickFormPublicPage />);

    await screen.findByRole('heading', { name: /rt-03 throttle guard/i });
    await user.type(screen.getByLabelText(/site note/i), 'First submit');

    const submit = screen.getByRole('button', { name: /^submit$/i });
    expect(submit).toBeDisabled();

    await user.click(screen.getByTestId('hcaptcha-success'));
    expect(submit).toBeEnabled();

    await user.click(submit);
    await waitFor(() => {
      expect(mockSubmitQuickForm).toHaveBeenCalledWith(
        expect.objectContaining({ captchaToken: 'mock-captcha-token' }),
      );
    });
    expect(screen.getByText(/submission received/i)).toBeInTheDocument();
    expect(screen.getByText(/please wait before submitting again/i)).toBeInTheDocument();
  });
});
