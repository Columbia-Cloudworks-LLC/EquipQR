import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ScanMachineSlide from './ScanMachineSlide';
import { ScanMachineStatic } from './ScanMachineStatic';

describe('ScanMachineSlide', () => {
  it('draws the dozer, the label on the machine, the phone, and the record stages', () => {
    render(<ScanMachineSlide onLoopComplete={vi.fn()} />);
    expect(screen.getByTestId('excavator-silhouette')).toBeInTheDocument();
    expect(screen.getByTestId('machine-qr-label')).toBeInTheDocument();
    expect(screen.getByTestId('scan-phone')).toBeInTheDocument();
    expect(screen.getByTestId('scan-asset-card')).toHaveTextContent('CAT D6 dozer');
    expect(screen.getByTestId('scan-asset-card')).toHaveTextContent('2,846 hrs');
    expect(screen.getByTestId('scan-work-order')).toHaveTextContent('Grease blade pivots');
    expect(screen.getByTestId('scan-history')).toHaveTextContent('Alex M.');
    expect(screen.getByTestId('scan-history')).toHaveTextContent('Mar 12');
  });

  it('reports a completed loop when the timeline repeats', () => {
    const onLoopComplete = vi.fn();
    render(<ScanMachineSlide onLoopComplete={onLoopComplete} />);
    const stage = screen.getByTestId('scan-machine-stage');
    stage.dispatchEvent(new Event('animationiteration', { bubbles: true }));
    stage.dispatchEvent(new Event('webkitAnimationIteration', { bubbles: true }));
    expect(onLoopComplete).toHaveBeenCalledTimes(1);
  });

  it('ignores child animation iterations so the gallery advances once per story', () => {
    const onLoopComplete = vi.fn();
    render(<ScanMachineSlide onLoopComplete={onLoopComplete} />);
    screen.getByTestId('scan-phone').dispatchEvent(new Event('animationiteration', { bubbles: true }));
    screen.getByTestId('scan-phone').dispatchEvent(new Event('webkitAnimationIteration', { bubbles: true }));
    expect(onLoopComplete).not.toHaveBeenCalled();
    screen.getByTestId('scan-machine-stage').dispatchEvent(new Event('animationiteration', { bubbles: true }));
    screen.getByTestId('scan-machine-stage').dispatchEvent(new Event('webkitAnimationIteration', { bubbles: true }));
    expect(onLoopComplete).toHaveBeenCalledOnce();
  });
});

describe('ScanMachineStatic', () => {
  it('shows the machine, hours, work, technician, and date in one still', () => {
    render(<ScanMachineStatic />);
    const record = screen.getByTestId('scan-static-record');
    expect(screen.getByTestId('excavator-silhouette')).toBeInTheDocument();
    expect(screen.getByTestId('machine-qr-label')).toBeInTheDocument();
    expect(record).toHaveTextContent('CAT D6 dozer');
    expect(record).toHaveTextContent('2,846 hrs');
    expect(record).toHaveTextContent('Grease blade pivots');
    expect(record).toHaveTextContent('Alex M.');
    expect(record).toHaveTextContent('Mar 12');
  });
});
