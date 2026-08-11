import React from 'react';
import { renderAsPersona, screen } from '@vitest-harness/utils/test-utils';
import { describe, it, expect, vi } from 'vitest';
import AppSidebar from './AppSidebar';
import { useInventoryAccess } from '@/features/inventory/hooks/useInventoryAccess';

vi.mock('@/hooks/use-mobile', () => ({
  useIsMobile: () => false,
}));

vi.mock('@/features/inventory/hooks/useInventoryAccess', () => ({
  useInventoryAccess: vi.fn(),
}));

vi.mock('@/components/ui/sidebar-context', async () => {
  const actual = await vi.importActual<typeof import('@/components/ui/sidebar-context')>(
    '@/components/ui/sidebar-context',
  );
  return {
    ...actual,
    useSidebar: () => ({
      state: 'expanded' as const,
      open: true,
      setOpen: vi.fn(),
      openMobile: false,
      setOpenMobile: vi.fn(),
      isMobile: false,
      toggleSidebar: vi.fn(),
    }),
  };
});

describe('AppSidebar', () => {
  beforeEach(() => {
    vi.mocked(useInventoryAccess).mockReturnValue({
      canView: true,
      canEdit: true,
      isPartsManager: false,
      isPartsConsumer: false,
      isLoading: false,
      currentOrganization: undefined,
    });
  });

  it('renders the three operational group labels for an admin', () => {
    renderAsPersona(<AppSidebar />, 'admin');

    expect(screen.getByText('Fleet')).toBeInTheDocument();
    expect(screen.getByText('Operations')).toBeInTheDocument();
    expect(screen.getByText('Infrastructure')).toBeInTheDocument();
    expect(screen.queryByText('Audit')).not.toBeInTheDocument();
  });

  it('exposes admin-only PM Templates for an admin', () => {
    renderAsPersona(<AppSidebar />, 'admin');

    expect(screen.getByRole('link', { name: /pm templates/i })).toBeInTheDocument();
  });

  it('does not expose DSR Cockpit or audit log in main navigation', () => {
    renderAsPersona(<AppSidebar />, 'admin');

    // DSR Cockpit lives in Legal footer + Settings → Privacy; Audit Log under org settings (#1122).
    expect(screen.queryByRole('link', { name: /dsr cockpit/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /audit log/i })).not.toBeInTheDocument();
  });

  it('hides admin-only items for a non-admin (technician)', () => {
    renderAsPersona(<AppSidebar />, 'technician');

    expect(screen.queryByRole('link', { name: /pm templates/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /audit log/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /dsr cockpit/i })).not.toBeInTheDocument();
  });

  it('hides inventory navigation for users without inventory access', () => {
    vi.mocked(useInventoryAccess).mockReturnValue({
      canView: false,
      canEdit: false,
      isPartsManager: false,
      isPartsConsumer: false,
      isLoading: false,
      currentOrganization: undefined,
    });

    renderAsPersona(<AppSidebar />, 'technician');

    expect(screen.queryByRole('link', { name: /^inventory$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /part lookup/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /part alternates/i })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^equipment$/i })).toBeInTheDocument();
  });

  it('does not mount OrganizationSwitcher inside the sidebar', () => {
    renderAsPersona(<AppSidebar />, 'admin');

    expect(
      screen.queryByRole('button', { name: /switch organization/i }),
    ).not.toBeInTheDocument();
  });

  it('does not mount the user profile menu inside the sidebar (now lives in TopBar)', () => {
    renderAsPersona(<AppSidebar />, 'admin');

    // The profile dropdown trigger is no longer rendered in the sidebar.
    expect(
      screen.queryByRole('button', { name: /user menu/i }),
    ).not.toBeInTheDocument();
    // And neither is its in-menu Sign out item.
    expect(screen.queryByText(/sign out/i)).not.toBeInTheDocument();
  });
});
