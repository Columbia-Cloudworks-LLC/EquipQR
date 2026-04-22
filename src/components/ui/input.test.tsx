import { describe, it, expect } from 'vitest';
import { render } from '@/test/utils/test-utils';
import { screen } from '@testing-library/dom';
import { Input } from './input';

describe('Input', () => {
  it('meets minimum 44px height for touch / pointer targets on mission-control field', () => {
    render(<Input aria-label="Equipment search" />);
    const el = screen.getByRole('textbox', { name: /equipment search/i });
    expect(el).toHaveClass('min-h-[44px]');
  });

  it('uses a thick focus-visible ring aligned with mission-control tokens', () => {
    render(<Input aria-label="Notes" />);
    const el = screen.getByRole('textbox', { name: /notes/i });
    expect(el).toHaveClass('focus-visible:ring-[3px]');
  });
});
