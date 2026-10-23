import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import PmLifecycleSlide from './PmLifecycleSlide';
import { PmLifecycleStatic } from './PmLifecycleStatic';

describe('PmLifecycleSlide (#1563)', () => {
  it('renders the machine, hour-meter progression, PM-due badge, inspection categories, and next 3,000 h interval', () => {
    render(<PmLifecycleSlide onLoopComplete={vi.fn()} />);

    expect(screen.getByTestId('excavator-silhouette')).toBeInTheDocument();
    expect(screen.getByTestId('pm-machine-qr-label')).toBeInTheDocument();

    const meter = screen.getByTestId('pm-hour-meter');
    expect(meter).toHaveTextContent('2,480 h');
    expect(meter).toHaveTextContent('2,500 h');
    expect(screen.getByTestId('pm-due-badge')).toHaveTextContent('PM DUE');

    const checklist = screen.getByTestId('pm-checklist-card');
    expect(checklist).toHaveTextContent('Fluids / filters');
    expect(checklist).toHaveTextContent('Grease points');
    expect(checklist).toHaveTextContent('Tires / tracks');
    expect(checklist).toHaveTextContent('Safety / visual');
    expect(screen.getByTestId('pm-technician-evidence')).toHaveTextContent('Alex M.');

    const nextCard = screen.getByTestId('pm-next-interval-card');
    expect(nextCard).toHaveTextContent('500-hr PM Completed');
    expect(nextCard).toHaveTextContent('NEXT: 3,000 h');
  });

  it('reports a completed loop when the stage timeline repeats and ignores child iterations', () => {
    const onLoopComplete = vi.fn();
    render(<PmLifecycleSlide onLoopComplete={onLoopComplete} />);

    screen
      .getByTestId('pm-hour-meter')
      .dispatchEvent(new Event('animationiteration', { bubbles: true }));
    screen
      .getByTestId('pm-hour-meter')
      .dispatchEvent(new Event('webkitAnimationIteration', { bubbles: true }));
    expect(onLoopComplete).not.toHaveBeenCalled();

    const stage = screen.getByTestId('pm-lifecycle-stage');
    stage.dispatchEvent(new Event('animationiteration', { bubbles: true }));
    stage.dispatchEvent(new Event('webkitAnimationIteration', { bubbles: true }));
    expect(onLoopComplete).toHaveBeenCalledTimes(1);
  });
});

describe('PmLifecycleStatic (#1563)', () => {
  it('shows the machine, current hours, PM-due state, completed PM domains, and next interval in one still', () => {
    render(<PmLifecycleStatic />);
    expect(screen.getByTestId('excavator-silhouette')).toBeInTheDocument();
    expect(screen.getByTestId('pm-static-qr-label')).toBeInTheDocument();

    const summary = screen.getByTestId('pm-lifecycle-static-summary');
    expect(summary).toHaveTextContent('CAT D6 dozer · 2,500 h');
    expect(summary).toHaveTextContent('PM DUE · 2,500 h');
    expect(summary).toHaveTextContent('NEXT: 3,000 h');
    expect(summary).toHaveTextContent('Fluids / filters');
    expect(summary).toHaveTextContent('Grease points');
    expect(summary).toHaveTextContent('Tires / tracks');
    expect(summary).toHaveTextContent('Safety / visual');
  });
});
