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
    expect(screen.getByTestId('app-providers')).toBeInTheDocument();
  });

  it('renders landing page for root path', () => {
    renderApp(['/']);
    expect(screen.getByTestId('landing-page')).toBeInTheDocument();
  });

  it('redirects legacy /landing to canonical / with hash preserved', () => {
    renderApp(['/landing#pricing']);
    expect(screen.getByTestId('navigate-to')).toHaveTextContent('Navigating to /#pricing');
  });

  it('renders auth page for /auth path', () => {
    renderApp(['/auth']);
    expect(screen.getByTestId('auth-page')).toBeInTheDocument();
  });

  it('renders support page for /support path', () => {
    renderApp(['/support']);
    expect(screen.getByTestId('support-page')).toBeInTheDocument();
  });

  it('renders terms page for /terms-of-service path', () => {
    renderApp(['/terms-of-service']);
    expect(screen.getByTestId('terms-page')).toBeInTheDocument();
  });

  it('renders privacy page for /privacy-policy path', () => {
    renderApp(['/privacy-policy']);
    expect(screen.getByTestId('privacy-page')).toBeInTheDocument();
  });

  it('renders privacy request page for /privacy-request path', () => {
    renderApp(['/privacy-request']);
    expect(screen.getByTestId('privacy-request-page')).toBeInTheDocument();
  });

  it('renders do-not-sell-or-share page for /do-not-sell-or-share path', () => {
    renderApp(['/do-not-sell-or-share']);
    expect(screen.getByTestId('do-not-sell-or-share-page')).toBeInTheDocument();
  });

  it('redirects equipment to equipment list', () => {
    renderApp(['/equipment/test-equipment']);
    expect(screen.getByTestId('navigate-to')).toHaveTextContent(
      'Navigating to /dashboard/equipment/test-equipment',
    );
  });

  it('renders lean equipment QR scan route outside the dashboard shell', () => {
    renderApp(['/qr/equipment/test-equipment']);
    expect(screen.getByTestId('equipment-qr-scan-page')).toBeInTheDocument();
    expect(screen.queryByTestId('top-bar')).not.toBeInTheDocument();
  });

  it('redirects work-orders to work-orders list', () => {
    renderApp(['/work-orders/test-work-order']);
    expect(screen.getByTestId('navigate-to')).toHaveTextContent(
      'Navigating to /dashboard/work-orders/test-work-order',
    );
  });

  it('renders TopBar component on dashboard route', () => {
    renderApp(['/dashboard']);
    expect(screen.getByTestId('top-bar')).toBeInTheDocument();
  });

  it('renders /dashboard/scan inside dashboard shell with TopBar', () => {
    renderApp(['/dashboard/scan']);
    expect(screen.getByTestId('top-bar')).toBeInTheDocument();
    expect(screen.getByTestId('equipment-scanner-page')).toBeInTheDocument();
  });

  it('renders DSR cockpit route for dashboard users', () => {
    renderApp(['/dashboard/dsr']);
    expect(screen.getByTestId('dsr-cockpit-page')).toBeInTheDocument();
  });
});
