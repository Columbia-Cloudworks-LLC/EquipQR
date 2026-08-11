import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { InventoryAccessGuard } from './InventoryAccessGuard';

vi.mock('@/features/inventory/hooks/useInventoryAccess', () => ({
  useInventoryAccess: vi.fn(),
}));

import { useInventoryAccess } from '@/features/inventory/hooks/useInventoryAccess';

describe('InventoryAccessGuard', () => {
  it('shows loading state while access is resolving', () => {
    vi.mocked(useInventoryAccess).mockReturnValue({
      canView: false,
      canEdit: false,
      isPartsManager: false,
      isPartsConsumer: false,
      isLoading: true,
      currentOrganization: undefined,
    });

    render(
      <InventoryAccessGuard>
        <div>Protected content</div>
      </InventoryAccessGuard>,
    );

    expect(screen.getByLabelText(/checking inventory access/i)).toBeInTheDocument();
    expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
  });

  it('renders access denied when user cannot view inventory', () => {
    vi.mocked(useInventoryAccess).mockReturnValue({
      canView: false,
      canEdit: false,
      isPartsManager: false,
      isPartsConsumer: false,
      isLoading: false,
      currentOrganization: undefined,
    });

    render(
      <InventoryAccessGuard>
        <div>Protected content</div>
      </InventoryAccessGuard>,
    );

    expect(screen.getByText(/inventory access required/i)).toBeInTheDocument();
    expect(screen.getByText(/parts consumer or parts manager access/i)).toBeInTheDocument();
    expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
  });

  it('renders children when user can view inventory', () => {
    vi.mocked(useInventoryAccess).mockReturnValue({
      canView: true,
      canEdit: false,
      isPartsManager: false,
      isPartsConsumer: true,
      isLoading: false,
      currentOrganization: undefined,
    });

    render(
      <InventoryAccessGuard>
        <div>Protected content</div>
      </InventoryAccessGuard>,
    );

    expect(screen.getByText('Protected content')).toBeInTheDocument();
  });
});
