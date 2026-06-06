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

  it('renders landing page for root path', async () => {
    renderApp(['/']);
    expect(await screen.findByTestId('landing-page')).toBeInTheDocument();
  });

  it('redirects legacy /landing to canonical / with hash preserved', () => {
    renderApp(['/landing#pricing']);
    expect(screen.getByTestId('navigate-to')).toHaveTextContent('Navigating to /#pricing');
  });

  it('renders auth page for /auth path', async () => {
    renderApp(['/auth']);
    expect(await screen.findByTestId('auth-page')).toBeInTheDocument();
  });

  it('renders support page for /support path', async () => {
    renderApp(['/support']);
    expect(await screen.findByTestId('support-page')).toBeInTheDocument();
  });

  it('renders terms page for /terms-of-service path', async () => {
    renderApp(['/terms-of-service']);
    expect(await screen.findByTestId('terms-page')).toBeInTheDocument();
  });

  it('renders privacy page for /privacy-policy path', async () => {
    renderApp(['/privacy-policy']);
    expect(await screen.findByTestId('privacy-page')).toBeInTheDocument();
  });

  it('renders privacy request page for /privacy-request path', async () => {
    renderApp(['/privacy-request']);
    expect(await screen.findByTestId('privacy-request-page')).toBeInTheDocument();
  });

  it('renders do-not-sell-or-share page for /do-not-sell-or-share path', async () => {
    renderApp(['/do-not-sell-or-share']);
    expect(await screen.findByTestId('do-not-sell-or-share-page')).toBeInTheDocument();
  });

  it('contains app providers', () => {
    renderApp();
    expect(screen.getByTestId('app-providers')).toBeInTheDocument();
  });

  it('redirects equipment to equipment list', () => {
    renderApp(['/equipment/test-equipment']);
    expect(screen.getByTestId('navigate-to')).toHaveTextContent(
      'Navigating to /dashboard/equipment/test-equipment',
    );
  });

  it('renders lean equipment QR scan route outside the dashboard shell', async () => {
    renderApp(['/qr/equipment/test-equipment']);
    expect(screen.getByText(/loading scanned equipment/i)).toBeInTheDocument();
    expect(await screen.findByTestId('equipment-qr-scan-page')).toBeInTheDocument();
    expect(screen.queryByTestId('top-bar')).not.toBeInTheDocument();
  });

  it('redirects work-orders to work-orders list', () => {
    renderApp(['/work-orders/test-work-order']);
    expect(screen.getByTestId('navigate-to')).toHaveTextContent(
      'Navigating to /dashboard/work-orders/test-work-order',
    );
  });

  it('renders TopBar component on dashboard route', async () => {
    renderApp(['/dashboard']);
    expect(await screen.findByTestId('top-bar')).toBeInTheDocument();
  });

  it('renders /dashboard/scan inside dashboard shell with TopBar', async () => {
    renderApp(['/dashboard/scan']);
    expect(await screen.findByTestId('top-bar')).toBeInTheDocument();
    expect(await screen.findByTestId('equipment-scanner-page')).toBeInTheDocument();
  });

  it('renders DSR cockpit route for dashboard users', async () => {
    renderApp(['/dashboard/dsr']);
    expect(await screen.findByTestId('dsr-cockpit-page')).toBeInTheDocument();
  });
});
