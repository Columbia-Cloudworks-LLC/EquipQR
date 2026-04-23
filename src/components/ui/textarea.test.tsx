import { describe, it, expect } from 'vitest';
import { render } from '@/test/utils/test-utils';
import { screen } from '@testing-library/dom';
import { Textarea } from './textarea';

describe('Textarea', () => {
  it('keeps a comfortably large touch target (min height)', () => {
    render(<Textarea aria-label="Work order details" />);
    const el = screen.getByRole('textbox', { name: /work order details/i });
    expect(el).toHaveClass('min-h-[80px]');
  });

  it('uses a thick focus-visible ring aligned with mission-control tokens', () => {
    render(<Textarea aria-label="Comments" />);
    const el = screen.getByRole('textbox', { name: /comments/i });
    expect(el).toHaveClass('focus-visible:ring-[3px]');
  });
});
