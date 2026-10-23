import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import CustomerRequestSlide from './CustomerRequestSlide';
import { CustomerRequestStatic } from './CustomerRequestStatic';

describe('CustomerRequestSlide (#1562)', () => {
  it('renders the QR-tagged machine, customer request, shop triage, technician work, and completion stages', () => {
    render(<CustomerRequestSlide onLoopComplete={vi.fn()} />);

    expect(screen.getByTestId('excavator-silhouette')).toBeInTheDocument();
    expect(screen.getByTestId('request-machine-qr-label')).toBeInTheDocument();
    expect(screen.getByTestId('request-customer-phone')).toBeInTheDocument();
    expect(screen.getByTestId('request-workflow-rail')).toBeInTheDocument();

    const requestCard = screen.getByTestId('customer-request-card');
    expect(requestCard).toHaveTextContent('CAT D6 dozer · SN EQ-10482');
    expect(requestCard).toHaveTextContent('REQUESTED');
    expect(requestCard).toHaveTextContent('Hydraulic leak on boom cylinder');
    expect(requestCard).toHaveTextContent('Request service');

    const triageCard = screen.getByTestId('shop-triage-card');
    expect(triageCard).toHaveTextContent('NEW');
    expect(triageCard).toHaveTextContent('ASSIGNED');
    expect(screen.getByTestId('assigned-technician-token')).toHaveTextContent('Alex M.');

    const workCard = screen.getByTestId('technician-work-card');
    expect(workCard).toHaveTextContent('IN PROGRESS');
    expect(workCard).toHaveTextContent('Replace boom hydraulic hose');
    expect(screen.getByTestId('technician-evidence-cue')).toHaveTextContent(
      'Repair photo & pressure note logged',
    );

    const closeoutCard = screen.getByTestId('request-closeout-card');
    expect(closeoutCard).toHaveTextContent('COMPLETED');
    expect(screen.getByTestId('customer-completion-pulse')).toHaveTextContent(
      'Requester notified',
    );
  });

  it('reports a completed loop when the stage timeline repeats and ignores child iterations', () => {
    const onLoopComplete = vi.fn();
    render(<CustomerRequestSlide onLoopComplete={onLoopComplete} />);

    screen
      .getByTestId('request-customer-phone')
      .dispatchEvent(new Event('animationiteration', { bubbles: true }));
    screen
      .getByTestId('request-customer-phone')
      .dispatchEvent(new Event('webkitAnimationIteration', { bubbles: true }));
    expect(onLoopComplete).not.toHaveBeenCalled();

    const stage = screen.getByTestId('customer-request-stage');
    stage.dispatchEvent(new Event('animationiteration', { bubbles: true }));
    stage.dispatchEvent(new Event('webkitAnimationIteration', { bubbles: true }));
    expect(onLoopComplete).toHaveBeenCalledTimes(1);
  });
});

describe('CustomerRequestStatic (#1562)', () => {
  it('shows the complete customer -> shop -> technician flow as a static connected diagram', () => {
    render(<CustomerRequestStatic />);
    expect(screen.getByTestId('excavator-silhouette')).toBeInTheDocument();
    expect(screen.getByTestId('request-static-qr-label')).toBeInTheDocument();

    const flow = screen.getByTestId('customer-request-static-flow');
    expect(flow).toHaveTextContent('CAT D6 dozer · SN EQ-10482');
    expect(flow).toHaveTextContent('REQUESTED');
    expect(flow).toHaveTextContent('Hydraulic leak');
    expect(flow).toHaveTextContent('ASSIGNED');
    expect(flow).toHaveTextContent('Alex M.');
    expect(flow).toHaveTextContent('COMPLETED');
  });
});
