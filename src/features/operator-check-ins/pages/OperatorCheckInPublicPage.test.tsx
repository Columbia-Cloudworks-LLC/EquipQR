import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@vitest-harness/utils/test-utils';
import userEvent from '@testing-library/user-event';
import OperatorCheckInPublicPage from '@/features/operator-check-ins/pages/OperatorCheckInPublicPage';
import type { OperatorCheckinLoadResponse } from '@/features/operator-check-ins/services/operatorCheckinPublicService';

const TEST_TOKEN = 'test-token-12345678901234567890123456789012';

const mockLoadOperatorCheckinForm = vi.fn();
const mockSubmitOperatorCheckin = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ token: TEST_TOKEN }),
  };
});

vi.mock('@/features/operator-check-ins/services/operatorCheckinPublicService', () => ({
  loadOperatorCheckinForm: (...args: unknown[]) => mockLoadOperatorCheckinForm(...args),
  submitOperatorCheckin: (...args: unknown[]) => mockSubmitOperatorCheckin(...args),
}));

vi.mock('@/components/seo/PageSEO', () => ({
  PageSEO: () => null,
}));

vi.mock('@/components/ui/HCaptcha', () => ({
  default: () => null,
}));

vi.mock('sonner', () => ({
  toast: { error: vi.fn() },
}));

const CHECKLIST_ITEM_ONE = {
  id: 'item-brakes',
  title: 'Service brakes operate correctly',
  required: true,
  section: 'Brakes',
};

const CHECKLIST_ITEM_TWO = {
  id: 'item-lights',
  title: 'Headlights and tail lights working',
  required: true,
  section: 'Lights',
};

const NAME_FIELD = {
  id: 'field-name',
  label: 'Your name',
  source: 'operator_input' as const,
  inputType: 'text' as const,
  required: true,
};

const mockFormResponse: OperatorCheckinLoadResponse = {
  template: {
    id: 'template-1',
    name: 'Evidence Daily Safety Walkaround',
    description: null,
    checklistItems: [CHECKLIST_ITEM_ONE, CHECKLIST_ITEM_TWO],
    dataFields: [NAME_FIELD],
  },
  equipmentPreviewFields: [],
  locationCollectionEnabled: false,
  captchaRequired: false,
  complianceNotice: 'Does not certify legal or regulatory compliance.',
};

function renderPublicPage() {
  return render(<OperatorCheckInPublicPage />);
}

function swipeChecklistRow(row: HTMLElement, deltaX: number) {
  fireEvent.pointerDown(row, { clientX: 100, pointerId: 1, pointerType: 'touch', buttons: 1 });
  fireEvent.pointerMove(row, {
    clientX: 100 + deltaX,
    pointerId: 1,
    pointerType: 'touch',
    buttons: 1,
  });
  fireEvent.pointerUp(row, {
    clientX: 100 + deltaX,
    pointerId: 1,
    pointerType: 'touch',
    buttons: 0,
  });
}

describe('OperatorCheckInPublicPage', () => {
  beforeEach(() => {
    mockLoadOperatorCheckinForm.mockReset();
    mockSubmitOperatorCheckin.mockReset();
    mockLoadOperatorCheckinForm.mockResolvedValue(mockFormResponse);
    mockSubmitOperatorCheckin.mockResolvedValue({
      submissionId: 'submission-1',
      submittedAt: '2026-07-05T12:00:00.000Z',
    });
  });

  it('records Pass on swipe right and Fail on swipe left with visible status labels', async () => {
    renderPublicPage();

    await screen.findByRole('heading', { name: /evidence daily safety walkaround/i });

    const brakesRow = await screen.findByTestId('checklist-item-row-item-brakes');
    swipeChecklistRow(brakesRow, 60);
    expect(screen.getByTestId('checklist-item-status-item-brakes')).toHaveTextContent('Pass');
    expect(brakesRow.className).toMatch(/emerald|green/i);

    const lightsRow = screen.getByTestId('checklist-item-row-item-lights');
    swipeChecklistRow(lightsRow, -60);
    expect(screen.getByTestId('checklist-item-status-item-lights')).toHaveTextContent('Fail');
    expect(lightsRow.className).toMatch(/destructive|red/i);
  });

  it('shows reset form after progress and clears answers and operator inputs', async () => {
    const user = userEvent.setup();
    renderPublicPage();

    await screen.findByRole('heading', { name: /evidence daily safety walkaround/i });
    await user.type(screen.getByLabelText(/your name/i), 'Evidence Operator');

    const brakesRow = screen.getByTestId('checklist-item-row-item-brakes');
    swipeChecklistRow(brakesRow, 60);
    expect(screen.getByTestId('checklist-item-status-item-brakes')).toHaveTextContent('Pass');

    const resetButton = screen.getByRole('button', { name: /reset form/i });
    await user.click(resetButton);

    expect(screen.getByLabelText(/your name/i)).toHaveValue('');
    expect(screen.getByTestId('checklist-item-status-item-brakes')).toHaveTextContent('Not checked');
    expect(screen.queryByRole('button', { name: /reset form/i })).not.toBeInTheDocument();
  });

  it('supports accessible Pass/Fail controls and submits checklist answers', async () => {
    const user = userEvent.setup();
    renderPublicPage();

    await screen.findByRole('heading', { name: /evidence daily safety walkaround/i });
    await user.type(screen.getByLabelText(/your name/i), 'Evidence Operator');

    await user.click(screen.getByRole('button', { name: /pass: service brakes operate correctly/i }));
    await user.click(screen.getByRole('button', { name: /fail: headlights and tail lights working/i }));

    await user.click(screen.getByRole('button', { name: /submit daily check-in/i }));

    await waitFor(() => {
      expect(mockSubmitOperatorCheckin).toHaveBeenCalledWith(
        expect.objectContaining({
          token: TEST_TOKEN,
          operatorFieldValues: expect.objectContaining({ 'field-name': 'Evidence Operator' }),
          checklistAnswers: expect.arrayContaining([
            { item_id: 'item-brakes', passed: true },
            { item_id: 'item-lights', passed: false },
          ]),
        }),
      );
    });

    expect(screen.getByText(/check-in complete/i)).toBeInTheDocument();
  });
});
