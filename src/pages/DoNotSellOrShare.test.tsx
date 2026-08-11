import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@vitest-harness/utils/test-utils';
import DoNotSellOrShare from './DoNotSellOrShare';

vi.mock('react-router-dom', async () => {
  const { createReactRouterDomTestMock } = await import(
    '@vitest-harness/utils/react-router-dom-test-mock'
  );
  return createReactRouterDomTestMock();
});

describe('DoNotSellOrShare', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<DoNotSellOrShare />);
    expect(
      screen.getByRole('heading', { name: /do not sell or share my personal information/i }),
    ).toBeInTheDocument();
  });

  it('links to the privacy request intake', () => {
    render(<DoNotSellOrShare />);

    const cta = screen.getByRole('link', { name: /submit a privacy request/i });
    expect(cta).toHaveAttribute('href', '/privacy-request');
  });

  it('includes a back button', () => {
    render(<DoNotSellOrShare />);
    expect(screen.getByRole('button', { name: 'Back' })).toBeInTheDocument();
  });
});
