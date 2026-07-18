import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import BottomNav from './BottomNav';

vi.mock('@/hooks/use-mobile', () => ({
  useIsMobile: () => true,
}));

vi.mock('@/components/ui/sidebar-context', () => ({
  useSidebar: () => ({
    setOpenMobile: vi.fn(),
  }),
}));

vi.mock('@/features/inventory/hooks/useInventoryAccess', () => ({
  useInventoryAccess: vi.fn(),
}));

import { useInventoryAccess } from '@/features/inventory/hooks/useInventoryAccess';

function renderBottomNav(path = '/dashboard') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <BottomNav />
    </MemoryRouter>,
  );
}

describe('BottomNav inventory RBAC', () => {
  it('hides Inventory for users without inventory view access', () => {
    vi.mocked(useInventoryAccess).mockReturnValue({
      canView: false,
      canEdit: false,
      isPartsManager: false,
      isPartsConsumer: false,
      isLoading: false,
      currentOrganization: undefined,
    });

    renderBottomNav();

    expect(screen.queryByRole('link', { name: /inventory/i })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /dashboard/i })).toBeInTheDocument();
  });

  it('shows Inventory for users with inventory view access', () => {
    vi.mocked(useInventoryAccess).mockReturnValue({
      canView: true,
      canEdit: false,
      isPartsManager: false,
      isPartsConsumer: true,
      isLoading: false,
      currentOrganization: undefined,
    });

    renderBottomNav();

    expect(screen.getByRole('link', { name: /inventory/i })).toBeInTheDocument();
  });
});
