import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@vitest-harness/utils/test-utils';
import userEvent from '@testing-library/user-event';
import { createMockSimpleOrgValue } from '@vitest-harness/utils/mock-provider-values';
import LegalFooter from './LegalFooter';
import { useSimpleOrganizationSafe } from '@/hooks/useSimpleOrganization';

vi.mock('@/lib/documentationUrl', () => ({
  SUPPORT_DOCS_URL: 'http://localhost:5174/support',
}));

vi.mock('@/hooks/useSimpleOrganization', () => ({
  useSimpleOrganizationSafe: vi.fn(),
}));

describe('LegalFooter', () => {
  it('uses the Help Center URL for the documentation link', () => {
    vi.mocked(useSimpleOrganizationSafe).mockReturnValue(null);

    render(<LegalFooter />);

    expect(screen.getByRole('link', { name: 'Help Center' })).toHaveAttribute(
      'href',
      'http://localhost:5174/support',
    );
  });

  it('includes DSR Cockpit in the Legal menu for organization admins', async () => {
    const user = userEvent.setup();
    vi.mocked(useSimpleOrganizationSafe).mockReturnValue(
      createMockSimpleOrgValue({ userRole: 'admin' }),
    );

    render(<LegalFooter />);

    await user.click(screen.getByRole('button', { name: /legal links/i }));

    expect(screen.getByRole('menuitem', { name: /dsr cockpit/i })).toHaveAttribute(
      'href',
      '/dashboard/dsr',
    );
  });

  it('hides DSR Cockpit in the Legal menu outside organization context', async () => {
    const user = userEvent.setup();
    vi.mocked(useSimpleOrganizationSafe).mockReturnValue(null);

    render(<LegalFooter />);

    await user.click(screen.getByRole('button', { name: /legal links/i }));

    expect(screen.queryByRole('menuitem', { name: /dsr cockpit/i })).not.toBeInTheDocument();
  });
});
