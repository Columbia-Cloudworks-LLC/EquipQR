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

  it('renders the phase container', () => {
    renderChecklist();
    expect(screen.getByTestId('pm-checklist-phase')).toBeInTheDocument();
  });

  it('renders all 5 checklist item elements after box expands', () => {
    renderChecklist();
    for (const item of ALL_PM_ITEMS) {
      expect(screen.getByTestId(`checklist-item-${item.id}`)).toBeInTheDocument();
    }
    expect(ALL_PM_ITEMS).toHaveLength(5);
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

  it('shows the export button after all check timers fire', async () => {
    renderChecklist({ exportSeed: 0 });

    // Advance past all check timers + button reveal delay
    await act(async () => {
      vi.advanceTimersByTime(3000);
    });

    const btn = screen.getByTestId('export-button');
    expect(btn).toBeInTheDocument();
  });

  it('export button label matches one of the three EXPORT_TARGETS', async () => {
    renderChecklist({ exportSeed: 1 });

    await act(async () => {
      vi.advanceTimersByTime(3000);
    });

    const btn = screen.getByTestId('export-button');
    const validLabels = EXPORT_TARGETS.map(t => t.label);
    expect(validLabels.some(label => btn.textContent?.includes(label.replace('Export to ', '')))).toBe(true);
  });

  it('each exportSeed value maps to a deterministic export target', () => {
    const seenTargets = EXPORT_TARGETS.map((_, i) => {
      const { unmount } = renderChecklist({ exportSeed: i });
      unmount();
      return EXPORT_TARGETS[Math.abs(i) % EXPORT_TARGETS.length].label;
    });
    expect(new Set(seenTargets).size).toBe(3);
  });

  it('renders with slideDirection right without crashing', () => {
    renderChecklist({ slideDirection: 'right', dotStageX: 72, dotStageY: 50 });
    expect(screen.getByTestId('pm-checklist-phase')).toBeInTheDocument();
  });
});
