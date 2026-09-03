import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DashboardLoadingShell } from './DashboardLoadingShell';

describe('DashboardLoadingShell', () => {
  it('renders the loading chrome from the named export', () => {
    render(<DashboardLoadingShell statusLabel="Checking authentication" />);

    expect(screen.getByTestId('dashboard-loading-shell')).toBeInTheDocument();
    expect(screen.getByTestId('dashboard-loading-sidebar')).toBeInTheDocument();
    expect(screen.getByTestId('dashboard-loading-header')).toBeInTheDocument();
    expect(
      screen.getByRole('status', { name: /checking authentication/i, hidden: true }),
    ).toBeInTheDocument();
    expect(screen.getByRole('status', { name: /loading page content/i })).toBeInTheDocument();
  });
});
