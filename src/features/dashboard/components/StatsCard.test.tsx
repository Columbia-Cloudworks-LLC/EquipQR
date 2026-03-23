import React from 'react';
import { render, screen, waitFor } from '@/test/utils/test-utils';
import { StatsCard } from './StatsCard';
import { Package } from 'lucide-react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

interface MockLinkProps {
  to: string;
  children: React.ReactNode;
  className?: string;
}

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    Link: ({ to, children, ...props }: MockLinkProps) => (
      <a href={to} onClick={() => mockNavigate(to)} {...props}>
        {children}
      </a>
    ),
  };
});

describe('StatsCard', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    vi.spyOn(window, 'matchMedia').mockImplementation((query: string) => ({
      matches: query === '(prefers-reduced-motion: reduce)',
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  });

  it('renders basic stats card', async () => {
    render(
      <StatsCard
        icon={<Package data-testid="package-icon" />}
        label="Total Equipment"
        value={42}
        sublabel="5 active"
      />
    );

    expect(screen.getByText('Total Equipment')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByTestId('total-equipment-value')).toHaveTextContent('42');
    });
    expect(screen.getByText('5 active')).toBeInTheDocument();
    expect(screen.getByTestId('package-icon')).toBeInTheDocument();
  });

  it('renders loading state with skeletons', () => {
    render(
      <StatsCard
        icon={<Package />}
        label="Total Equipment"
        value={42}
        loading={true}
      />
    );

    expect(screen.queryByText('Total Equipment')).not.toBeInTheDocument();
    // Should show skeleton instead of value and label
    expect(screen.queryByText('42')).not.toBeInTheDocument();
  });

  it('renders as clickable link when to prop is provided', () => {
    render(
      <StatsCard
        icon={<Package />}
        label="Total Equipment"
        value={42}
        to="/dashboard/equipment"
      />
    );

    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/dashboard/equipment');
    expect(link).toHaveClass('cursor-pointer');
  });

  it('does not render as link when loading', () => {
    render(
      <StatsCard
        icon={<Package />}
        label="Total Equipment"
        value={42}
        to="/dashboard/equipment"
        loading={true}
      />
    );

    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('renders trend information when provided', () => {
    render(
      <StatsCard
        icon={<Package />}
        label="Total Equipment"
        value={42}
        trend={{ direction: 'up', delta: 12 }}
      />
    );

    expect(screen.getByText('12% this week')).toBeInTheDocument();
  });

  it('renders different trend directions', () => {
    const { rerender } = render(
      <StatsCard
        icon={<Package />}
        label="Test"
        value={42}
        trend={{ direction: 'down', delta: 5 }}
      />
    );

    expect(screen.getByText('5% this week')).toBeInTheDocument();

    rerender(
      <StatsCard
        icon={<Package />}
        label="Test"
        value={42}
        trend={{ direction: 'flat', delta: 0 }}
      />
    );

    expect(screen.getByText('0% this week')).toBeInTheDocument();
  });

  it('applies aria-label when ariaDescription is provided', () => {
    render(
      <StatsCard
        icon={<Package />}
        label="Total Equipment"
        value={42}
        ariaDescription="Shows total equipment count"
      />
    );

    expect(screen.getByLabelText('Shows total equipment count')).toBeInTheDocument();
  });

  it('generates correct test id for value element', () => {
    render(
      <StatsCard
        icon={<Package />}
        label="Total Equipment"
        value={42}
      />
    );

    expect(screen.getByTestId('total-equipment-value')).toBeInTheDocument();
  });
});