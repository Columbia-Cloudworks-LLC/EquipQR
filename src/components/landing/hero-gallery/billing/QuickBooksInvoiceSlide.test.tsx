import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import QuickBooksInvoiceSlide from './QuickBooksInvoiceSlide';
import { QuickBooksInvoiceStatic } from './QuickBooksInvoiceStatic';

describe('QuickBooksInvoiceSlide (#1564)', () => {
  it('renders the QR-linked machine work order, structured labor/parts office review, and traceable QuickBooks draft invoice', () => {
    render(<QuickBooksInvoiceSlide onLoopComplete={vi.fn()} />);

    expect(screen.getByTestId('excavator-silhouette')).toBeInTheDocument();
    expect(screen.getByTestId('billing-machine-qr-label')).toBeInTheDocument();
    expect(screen.getByTestId('billing-connector-rail')).toBeInTheDocument();

    const fieldCard = screen.getByTestId('billing-field-work-card');
    expect(fieldCard).toHaveTextContent('WO #418 · CAT D6 dozer (SN EQ-10482)');
    expect(fieldCard).toHaveTextContent('COMPLETED');

    const reviewCard = screen.getByTestId('billing-office-review-card');
    expect(reviewCard).toHaveTextContent('Labor');
    expect(reviewCard).toHaveTextContent('Parts');
    expect(reviewCard).toHaveTextContent('Service');
    expect(reviewCard).toHaveTextContent('Total $660.00');
    expect(screen.getByTestId('billing-office-approval')).toHaveTextContent(
      'Reviewed & approved by office manager',
    );

    const invoiceCard = screen.getByTestId('quickbooks-draft-invoice-card');
    expect(invoiceCard).toHaveTextContent('QuickBooks draft invoice · #INV-2048');
    expect(invoiceCard).toHaveTextContent('DRAFT READY');
    expect(screen.getByTestId('billing-traceability-link')).toHaveTextContent(
      'Traceable to EquipQR WO #418 · CAT D6 dozer (SN EQ-10482)',
    );
  });

  it('reports a completed loop when the stage timeline repeats and ignores child iterations', () => {
    const onLoopComplete = vi.fn();
    render(<QuickBooksInvoiceSlide onLoopComplete={onLoopComplete} />);

    screen
      .getByTestId('billing-field-work-card')
      .dispatchEvent(new Event('animationiteration', { bubbles: true }));
    screen
      .getByTestId('billing-field-work-card')
      .dispatchEvent(new Event('webkitAnimationIteration', { bubbles: true }));
    expect(onLoopComplete).not.toHaveBeenCalled();

    const stage = screen.getByTestId('quickbooks-invoice-stage');
    stage.dispatchEvent(new Event('animationiteration', { bubbles: true }));
    stage.dispatchEvent(new Event('webkitAnimationIteration', { bubbles: true }));
    expect(onLoopComplete).toHaveBeenCalledTimes(1);
  });
});

describe('QuickBooksInvoiceStatic (#1564)', () => {
  it('shows field completion, reviewed charges, and QuickBooks draft invoice in one static composition', () => {
    render(<QuickBooksInvoiceStatic />);
    expect(screen.getByTestId('excavator-silhouette')).toBeInTheDocument();
    expect(screen.getByTestId('billing-static-qr-label')).toBeInTheDocument();

    const flow = screen.getByTestId('quickbooks-invoice-static-flow');
    expect(flow).toHaveTextContent('CAT D6 dozer · WO #418');
    expect(flow).toHaveTextContent('QuickBooks draft invoice');
    expect(flow).toHaveTextContent('Labor $350 · Parts $265');
    expect(flow).toHaveTextContent('Draft #INV-2048 ready');
    expect(flow).toHaveTextContent('Linked to WO #418');
  });
});
