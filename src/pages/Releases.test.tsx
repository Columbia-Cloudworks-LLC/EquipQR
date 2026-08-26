import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { PublicRelease } from '@/lib/publicReleaseTypes';

type ReleaseCategory = 'added' | 'changed' | 'fixed' | 'security';

vi.mock('@/components/landing/LandingHeader', () => ({
  default: () => <div data-testid="landing-header">Landing Header</div>,
}));

vi.mock('@/components/layout/LegalFooter', () => ({
  default: ({ contextAware }: { contextAware?: boolean }) => (
    <div data-testid="legal-footer">{contextAware === false ? 'Legal Footer Static' : 'Legal Footer'}</div>
  ),
}));

function labelForCategory(category: ReleaseCategory): string {
  switch (category) {
    case 'added':
      return 'Added';
    case 'changed':
      return 'Changed';
    case 'fixed':
      return 'Fixed';
    case 'security':
      return 'Security';
    default: {
      const exhaustive: never = category;
      return exhaustive;
    }
  }
}

function buildReleases(categories: readonly ReleaseCategory[]): PublicRelease[] {
  return categories.map((category, index) => {
    const version = `3.0.${categories.length - index}`;
    const label = labelForCategory(category);

    return {
      version,
      date: `2026-08-${String(index + 1).padStart(2, '0')}`,
      isLatest: index === 0,
      sections: [
        {
          id: category,
          label,
          entries: [
            {
              title: `${label} note ${version}`,
              body: `Customer-facing summary for ${version}.`,
              issueRefs: [`#${1400 + index}`],
            },
          ],
        },
      ],
    };
  });
}

async function loadReleasesPage(releases: readonly PublicRelease[]) {
  vi.resetModules();
  vi.doMock('@/lib/publicReleases', async () => {
    const actual = await import('@/lib/publicReleaseTypes');

    return {
      INITIAL_VISIBLE_PUBLIC_RELEASES: 10,
      PUBLIC_RELEASE_FILTER_LABELS: {
        all: 'All',
        features: 'Features',
        fixes: 'Fixes',
        security: 'Security',
      },
      PUBLIC_RELEASES: releases,
      releaseMatchesPublicReleaseFilter: actual.releaseMatchesPublicReleaseFilter,
      sectionMatchesPublicReleaseFilter: actual.sectionMatchesPublicReleaseFilter,
    };
  });

  const module = await import('@/pages/Releases');
  return {
    Releases: module.Releases,
  };
}

describe('Releases', () => {
  const originalScrollIntoView = HTMLElement.prototype.scrollIntoView;
  const scrollIntoViewMock = vi.fn<(options?: ScrollIntoViewOptions) => void>();

  beforeEach(() => {
    scrollIntoViewMock.mockReset();
    HTMLElement.prototype.scrollIntoView = scrollIntoViewMock;
  });

  afterEach(() => {
    HTMLElement.prototype.scrollIntoView = originalScrollIntoView;
    cleanup();
  });

  async function renderReleasesPage(
    releases: readonly PublicRelease[],
    initialEntries: string[] = ['/releases'],
  ) {
    const { Releases } = await loadReleasesPage(releases);

    render(
      <MemoryRouter initialEntries={initialEntries}>
        <Routes>
          <Route path="/releases" element={<Releases />} />
        </Routes>
      </MemoryRouter>,
    );
  }

  it('renders the latest release expanded and keeps older releases behind one control when more than 10 releases exist', async () => {
    await renderReleasesPage(
      buildReleases([
        'added',
        'fixed',
        'security',
        'changed',
        'fixed',
        'added',
        'changed',
        'fixed',
        'security',
        'added',
        'fixed',
        'changed',
      ]),
    );

    expect(screen.getByRole('heading', { name: 'Releases', level: 1 })).toBeInTheDocument();
    expect(screen.getByText('Latest')).toBeInTheDocument();
    expect(screen.getByText('Added note 3.0.12')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Show 2 older releases' })).toBeInTheDocument();
    expect(screen.queryByText('Changed note 3.0.1')).not.toBeInTheDocument();
    expect(screen.getByTestId('legal-footer')).toHaveTextContent('Legal Footer Static');
  });

  it('shows all cards open and no reveal control when 10 or fewer releases exist', async () => {
    await renderReleasesPage(
      buildReleases([
        'added',
        'fixed',
        'changed',
        'fixed',
        'added',
        'changed',
        'fixed',
        'added',
        'fixed',
        'changed',
      ]),
    );

    expect(screen.queryByRole('button', { name: /show \d+ older releases/i })).not.toBeInTheDocument();
    expect(screen.getByText('Changed note 3.0.1')).toBeInTheDocument();
  });

  it('shows the exact empty-filter copy and offers All as the next action', async () => {
    const user = userEvent.setup({ delay: null });
    await renderReleasesPage(
      buildReleases([
        'added',
        'fixed',
        'changed',
        'fixed',
        'added',
        'changed',
        'fixed',
        'added',
        'changed',
        'fixed',
        'security',
        'security',
      ]),
    );

    await user.click(screen.getByRole('radio', { name: 'Security' }));

    expect(
      screen.getByText('No Security notes are visible in the current release set.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /show \d+ older releases/i })).not.toBeInTheDocument();
    expect(screen.queryByText('Security note 3.0.2')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'All' }));

    expect(screen.getByText('Added note 3.0.12')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Show 2 older releases' })).toBeInTheDocument();
  });

  it('reveals and scrolls to an older release when loading a hash deep link', async () => {
    await renderReleasesPage(
      buildReleases([
        'added',
        'fixed',
        'security',
        'changed',
        'fixed',
        'added',
        'changed',
        'fixed',
        'security',
        'added',
        'fixed',
        'changed',
      ]),
      ['/releases#3.0.2'],
    );

    await waitFor(() => {
      expect(screen.getByText('Fixed note 3.0.2')).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: 'Hide older releases' })).toBeInTheDocument();
    await waitFor(() => {
      expect(scrollIntoViewMock).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
    });
  });

  it('keeps the default first paint when the hash does not match a released version', async () => {
    await renderReleasesPage(
      buildReleases([
        'added',
        'fixed',
        'security',
        'changed',
        'fixed',
        'added',
        'changed',
        'fixed',
        'security',
        'added',
        'fixed',
        'changed',
      ]),
      ['/releases#not-a-release'],
    );

    expect(screen.getByText('Added note 3.0.12')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Show 2 older releases' })).toBeInTheDocument();
    expect(screen.queryByText('Changed note 3.0.1')).not.toBeInTheDocument();
    expect(
      screen.queryByText(/No (All|Features|Fixes|Security) notes are visible in the current release set\./),
    ).not.toBeInTheDocument();
    expect(scrollIntoViewMock).not.toHaveBeenCalled();
  });
});
