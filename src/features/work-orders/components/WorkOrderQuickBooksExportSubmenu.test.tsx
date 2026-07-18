import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@vitest-harness/utils/test-utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { WorkOrderQuickBooksExportSubmenu } from './WorkOrderQuickBooksExportSubmenu';

const mockUseQuickBooksAccess = vi.fn();
const mockUseExportToQuickBooks = vi.fn();
const mockUseQuickBooksLastExport = vi.fn();
const mockIsQuickBooksEnabled = vi.fn();

vi.mock('@/hooks/useQuickBooksAccess', () => ({
  useQuickBooksAccess: (...args: unknown[]) => mockUseQuickBooksAccess(...args),
}));

vi.mock('@/hooks/useExportToQuickBooks', () => ({
  useExportToQuickBooks: (...args: unknown[]) => mockUseExportToQuickBooks(...args),
  useQuickBooksLastExport: (...args: unknown[]) => mockUseQuickBooksLastExport(...args),
}));

vi.mock('@/lib/flags', () => ({
  isQuickBooksEnabled: (...args: unknown[]) => mockIsQuickBooksEnabled(...args),
}));

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>();
  return {
    ...actual,
    useQuery: () => ({ data: undefined, isLoading: false }),
  };
});

describe('WorkOrderQuickBooksExportSubmenu', () => {
  const renderSubmenu = () =>
    render(
      <DropdownMenu open>
        <DropdownMenuTrigger asChild>
          <Button>Export</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <WorkOrderQuickBooksExportSubmenu
            workOrderId="wo-1"
            teamId="team-1"
            workOrderStatus="completed"
          />
        </DropdownMenuContent>
      </DropdownMenu>,
    );

  beforeEach(() => {
    vi.clearAllMocks();
    mockIsQuickBooksEnabled.mockReturnValue(true);
    mockUseQuickBooksAccess.mockReturnValue({ data: true });
    mockUseExportToQuickBooks.mockReturnValue({ isPending: false, mutate: vi.fn() });
    mockUseQuickBooksLastExport.mockReturnValue({ data: null });
  });

  it('returns null when QuickBooks is disabled', () => {
    mockIsQuickBooksEnabled.mockReturnValue(false);

    renderSubmenu();
    expect(screen.queryByRole('menuitem', { name: 'QuickBooks' })).not.toBeInTheDocument();
  });
});
