import React from 'react';
import { render, screen } from '@/test/utils/test-utils';
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
  });

  it('renders basic stats card', () => {
    render(
      <StatsCard
        icon={<Package data-testid="package-icon" />}
        label="Total Equipment"
        value={42}
        sublabel="5 active"
      />
    );

    expect(screen.getByText('Total Equipment')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
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

    expect(screen.getByText('Total Equipment')).toBeInTheDocument();
    // Should show skeleton instead of value
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

    expect(screen.getByText('↗')).toBeInTheDocument();
    expect(screen.getByText('12%')).toBeInTheDocument();
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

    expect(screen.getByText('↘')).toBeInTheDocument();

    rerender(
      <StatsCard
        icon={<Package />}
        label="Test"
        value={42}
        trend={{ direction: 'flat', delta: 0 }}
      />
    );

    expect(screen.getByText('→')).toBeInTheDocument();
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