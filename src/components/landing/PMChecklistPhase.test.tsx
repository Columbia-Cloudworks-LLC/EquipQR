import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('gsap', () => ({
  gsap: {
    registerPlugin: vi.fn(),
    timeline: vi.fn(() => ({
      to: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      fromTo: vi.fn().mockReturnThis(),
      kill: vi.fn(),
    })),
    to: vi.fn(() => ({ kill: vi.fn() })),
    from: vi.fn(() => ({ kill: vi.fn() })),
    context: vi.fn(() => ({ revert: vi.fn() })),
  },
  default: {
    registerPlugin: vi.fn(),
    timeline: vi.fn(() => ({
      to: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      fromTo: vi.fn().mockReturnThis(),
      kill: vi.fn(),
    })),
    to: vi.fn(() => ({ kill: vi.fn() })),
    from: vi.fn(() => ({ kill: vi.fn() })),
    context: vi.fn(() => ({ revert: vi.fn() })),
  },
}));

vi.mock('@gsap/react', () => ({ useGSAP: vi.fn() }));

import PMChecklistPhase from './PMChecklistPhase';
import { ALL_PM_ITEMS, EXPORT_TARGETS } from './pmChecklistData';

const defaultProps = {
  slideDirection: 'left' as const,
  dotStageX: 24,   // (60/100) * 40 for slideDirection='left'
  dotStageY: 50,
  exportSeed: 0,
  onComplete: vi.fn(),
};

function renderChecklist(props = {}) {
  return render(
    <MemoryRouter>
      <PMChecklistPhase {...defaultProps} {...props} />
    </MemoryRouter>,
  );
}

describe('PMChecklistPhase', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders all 5 checklist item elements after box expands', () => {
    renderChecklist();
    for (const item of ALL_PM_ITEMS) {
      expect(screen.getByTestId(`checklist-item-${item.id}`)).toBeInTheDocument();
    }
  });

  it('shows the correct checklist item titles', () => {
    renderChecklist();
    const expectedTitles = [
      'Oil/Coolant Leaks',
      'Tire & Wheel Condition',
      'Seat & Seat Belt Condition',
      'Check Condition of Air Filter',
      'Change Engine Oil & Filter',
    ];
    for (const title of expectedTitles) {
      expect(screen.getByText(title)).toBeInTheDocument();
    }
  });

  it('export button label matches one of the three EXPORT_TARGETS', () => {
    renderChecklist({ exportSeed: 1 });
    const btn = screen.getByTestId('export-button');
    const validLabels = EXPORT_TARGETS.map(t => t.label);
    expect(validLabels.some(label => btn.textContent?.includes(label.replace('Export to ', '')))).toBe(true);
  });

  it('export button is dimmed before last item checked', () => {
    renderChecklist({ exportSeed: 0 });
    const btn = screen.getByTestId('export-button');
    expect(btn.className).toContain('opacity-60');
  });

  it('export button becomes active after all check timers fire', async () => {
    renderChecklist({ exportSeed: 0 });

    await act(async () => {
      vi.advanceTimersByTime(3000);
    });

    const btn = screen.getByTestId('export-button');
    // After all items checked, opacity-60 should be gone
    expect(btn.className).not.toContain('opacity-60');
  });

  it.each([
    [0, 'Export to QuickBooks'],
    [1, 'Export to Google Drive'],
    [2, 'Export to Excel'],
    [3, 'Export to QuickBooks'],
    [-1, 'Export to Google Drive'],
  ])('exportSeed %i labels the export button %s', (exportSeed, expectedLabel) => {
    renderChecklist({ exportSeed });
    expect(screen.getByTestId('export-button')).toHaveTextContent(expectedLabel);
  });

  it('renders with slideDirection right without crashing', () => {
    renderChecklist({ slideDirection: 'right', dotStageX: 72, dotStageY: 50 });
    expect(screen.getByTestId('pm-checklist-phase')).toBeInTheDocument();
  });
});
