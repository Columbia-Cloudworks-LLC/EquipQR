import './appRoutesTestMocks';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '@/App';
import { resetAppRoutesTestQueryClient } from './appRoutesTestMocks';

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetAppRoutesTestQueryClient();
  });

  const renderApp = (initialEntries = ['/']) => {
    return render(
      <MemoryRouter initialEntries={initialEntries}>
        <App />
      </MemoryRouter>,
    );
  };

  it('renders without crashing', () => {
    renderApp();
    expect(screen.getByRole('region', { name: /app providers/i })).toBeInTheDocument();
  });

  it('renders landing page for root path', () => {
    renderApp(['/']);
    expect(screen.getByText('Landing')).toBeInTheDocument();
  });

  it('redirects legacy /landing to canonical / with hash preserved', () => {
    renderApp(['/landing#pricing']);
    expect(screen.getByText('Navigating to /#pricing')).toBeInTheDocument();
  });

  it('renders auth page for /auth path', () => {
    renderApp(['/auth']);
    expect(screen.getByText('Auth')).toBeInTheDocument();
  });

  it('renders support page for /support path', () => {
    renderApp(['/support']);
    expect(screen.getByText('Support')).toBeInTheDocument();
  });

  it('renders terms page for /terms-of-service path', () => {
    renderApp(['/terms-of-service']);
    expect(screen.getByText('Terms')).toBeInTheDocument();
  });

  it('renders privacy page for /privacy-policy path', () => {
    renderApp(['/privacy-policy']);
    expect(screen.getByText('Privacy')).toBeInTheDocument();
  });

  it('renders privacy request page for /privacy-request path', () => {
    renderApp(['/privacy-request']);
    expect(screen.getByText('Privacy Request')).toBeInTheDocument();
  });

  it('renders do-not-sell-or-share page for /do-not-sell-or-share path', () => {
    renderApp(['/do-not-sell-or-share']);
    expect(screen.getByText('Do Not Sell Or Share')).toBeInTheDocument();
  });

  it('redirects equipment to equipment list', () => {
    renderApp(['/equipment/test-equipment']);
    expect(screen.getByText('Navigating to /dashboard/equipment/test-equipment')).toBeInTheDocument();
  });

  it('renders lean equipment QR scan route outside the dashboard shell', () => {
    renderApp(['/qr/equipment/test-equipment']);
    expect(screen.getByText('Equipment QR Scan')).toBeInTheDocument();
    expect(screen.queryByText('TopBar')).not.toBeInTheDocument();
  });

  it('redirects work-orders to work-orders list', () => {
    renderApp(['/work-orders/test-work-order']);
    expect(screen.getByText('Navigating to /dashboard/work-orders/test-work-order')).toBeInTheDocument();
  });

  it('renders TopBar component on dashboard route', () => {
    renderApp(['/dashboard']);
    expect(screen.getByText('TopBar')).toBeInTheDocument();
  });

  it('renders /dashboard/scan inside dashboard shell with TopBar', () => {
    renderApp(['/dashboard/scan']);
    expect(screen.getByText('TopBar')).toBeInTheDocument();
    expect(screen.getByText('Equipment Scanner')).toBeInTheDocument();
  });

  it('renders DSR cockpit route for dashboard users', () => {
    renderApp(['/dashboard/dsr']);
    expect(screen.getByText('DSR Cockpit')).toBeInTheDocument();
  });
});
