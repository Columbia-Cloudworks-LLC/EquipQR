import { afterEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { PublicRelease } from '@/features/releases/lib/publicReleaseTypes';

function buildPublicReleases(): PublicRelease[] {
  return [
    {
      version: '3.29.0',
      date: '2026-08-23',
      isLatest: true,
      sections: [
        {
          id: 'added',
          label: 'Added',
          entries: [
            {
              title: 'Public releases page',
              body: 'Customers can review published EquipQR changes without opening GitHub.',
              issueRefs: ['#1460'],
            },
          ],
        },
      ],
    },
    {
      version: '3.28.0',
      date: '2026-08-10',
      isLatest: false,
      sections: [
        {
          id: 'fixed',
          label: 'Fixed',
          entries: [
            {
              title: 'Notification links',
              body: 'Tapping a notification opens the matching work order page.',
              issueRefs: ['#1431'],
            },
          ],
        },
      ],
    },
  ];
}

async function renderReleasesPage(userRole: 'admin' | null) {
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
  vi.doMock('@/features/releases/lib/publicReleases', async () => {
    const actual = await import('@/features/releases/lib/publicReleaseTypes');

    return {
      INITIAL_VISIBLE_PUBLIC_RELEASES: 10,
      PUBLIC_RELEASE_FILTER_LABELS: {
        all: 'All',
        features: 'Features',
        fixes: 'Fixes',
        security: 'Security',
      },
      PUBLIC_RELEASES: buildPublicReleases(),
      releaseMatchesPublicReleaseFilter: actual.releaseMatchesPublicReleaseFilter,
      sectionMatchesPublicReleaseFilter: actual.sectionMatchesPublicReleaseFilter,
    };
  });

  const module = await import('@/pages/Releases');
  const Releases = module.Releases;
  const user = userEvent.setup({ delay: null });

  render(
    <MemoryRouter initialEntries={['/releases']}>
      <Routes>
        <Route path="/releases" element={<Releases />} />
      </Routes>
    </MemoryRouter>,
  );

  const versionHref = screen
    .getByRole('link', { name: /view release notes for equipqr version/i })
    .getAttribute('href');
  const getStartedHref = screen.getByRole('link', { name: 'Get Started' }).getAttribute('href');
  const headingVisible = screen.getByRole('heading', { name: 'Releases', level: 1 });
  const latestVisible = screen.getByText('Public releases page');
  await user.click(screen.getByRole('button', { name: /legal links/i }));

  return {
    menuLabels: screen.getAllByRole('menuitem').map((item) => item.textContent?.trim() ?? ''),
    versionHref,
    getStartedHref,
    headingVisible,
    latestVisible,
  };
}

describe('Releases public chrome', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders the same public header/footer and release list for signed-in admins and anonymous visitors', async () => {
    const signedIn = await renderReleasesPage('admin');

    expect(signedIn.headingVisible).toBeInTheDocument();
    expect(signedIn.latestVisible).toBeInTheDocument();
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

    const anonymous = await renderReleasesPage(null);

    expect(anonymous.headingVisible).toBeInTheDocument();
    expect(anonymous.latestVisible).toBeInTheDocument();
    expect(anonymous.getStartedHref).toBe('/auth');
    expect(anonymous.versionHref).toBe('/releases');
    expect(anonymous.menuLabels).toEqual(signedIn.menuLabels);
    expect(screen.queryByText('DSR Cockpit')).not.toBeInTheDocument();
  });
});
