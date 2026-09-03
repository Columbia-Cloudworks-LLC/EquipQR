import { afterEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

async function renderNotFoundPage(userRole: 'admin' | null) {
  vi.resetModules();
  vi.doMock('@/hooks/useActiveSection', () => ({
    useActiveSection: () => null,
  }));
  vi.doMock('@/lib/documentationUrl', () => ({
    SUPPORT_DOCS_URL: 'http://localhost:5174/support',
  }));
  vi.doMock('@/hooks/useSimpleOrganization', () => ({
    useSimpleOrganizationSafe: () =>
      userRole === null
        ? null
        : {
            currentOrganization: {
              userRole,
            },
          },
  }));

  const module = await import('@/pages/NotFound');
  const NotFound = module.default;
  const user = userEvent.setup({ delay: null });

  render(
    <MemoryRouter initialEntries={['/this-is-not-a-route']}>
      <Routes>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </MemoryRouter>,
  );

  const versionHref = screen
    .getByRole('link', { name: /view release notes for equipqr version/i })
    .getAttribute('href');
  const getStartedHref = screen.getByRole('link', { name: 'Get Started' }).getAttribute('href');
  const headingVisible = screen.getByRole('heading', { name: 'Page not found', level: 1 });
  const missingPathVisible = screen.getByText('/this-is-not-a-route');
  await user.click(screen.getByRole('button', { name: /legal links/i }));

  return {
    menuLabels: screen.getAllByRole('menuitem').map((item) => item.textContent?.trim() ?? ''),
    versionHref,
    getStartedHref,
    headingVisible,
    missingPathVisible,
  };
}

describe('NotFound public chrome', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders the same public header/footer for signed-in admins and anonymous visitors', async () => {
    const signedIn = await renderNotFoundPage('admin');

    expect(signedIn.headingVisible).toBeInTheDocument();
    expect(signedIn.missingPathVisible).toBeInTheDocument();
    expect(signedIn.getStartedHref).toBe('/auth');
    expect(signedIn.versionHref).toBe('/releases');
    expect(signedIn.menuLabels).toEqual([
      'Releases',
      'Terms of Service',
      'Security',
      'Right to Repair',
      'Privacy Policy',
      'Do Not Sell or Share',
    ]);
    expect(screen.queryByText('DSR Cockpit')).not.toBeInTheDocument();

    cleanup();

    const anonymous = await renderNotFoundPage(null);

    expect(anonymous.headingVisible).toBeInTheDocument();
    expect(anonymous.missingPathVisible).toBeInTheDocument();
    expect(anonymous.getStartedHref).toBe('/auth');
    expect(anonymous.versionHref).toBe('/releases');
    expect(anonymous.menuLabels).toEqual(signedIn.menuLabels);
    expect(screen.queryByText('DSR Cockpit')).not.toBeInTheDocument();
  });
});
