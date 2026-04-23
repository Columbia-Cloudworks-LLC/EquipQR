import { describe, it, expect, vi } from 'vitest';
import { render } from '@/test/utils/test-utils';
import { screen } from '@testing-library/dom';
import userEvent from '@testing-library/user-event';
import { Button } from './button';

describe('Button', () => {
  it('renders correctly', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
  });

  it('handles click events', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    
    render(<Button onClick={handleClick}>Click me</Button>);
    
    await user.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledOnce();
  });

  it('applies minimum 44×44px touch target to default (primary) variant', () => {
    render(<Button>Create Work Order</Button>);
    const el = screen.getByRole('button', { name: /create work order/i });
    expect(el).toHaveClass('min-h-[44px]');
    expect(el).toHaveClass('min-w-[44px]');
  });

  it('does not expand touch target for non-primary variants', () => {
    render(
      <Button variant="outline">Cancel</Button>
    );
    const el = screen.getByRole('button', { name: /cancel/i });
    expect(el).not.toHaveClass('min-h-[44px]');
  });

  it('uses a thick focus-visible ring for keyboard users (mission-control contrast)', () => {
    render(<Button type="button">Save</Button>);
    const el = screen.getByRole('button', { name: /save/i });
    expect(el).toHaveClass('focus-visible:ring-[3px]');
  });
});