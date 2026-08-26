import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Releases } from '@/pages/Releases';
import type { PublicRelease } from '@/lib/publicReleaseTypes';

const mockedReleases = vi.hoisted(() => {
  const categories = [
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
  ] as const;

  return categories.map((category, index) => {
    const version = `3.0.${12 - index}`;
    const label =
      category === 'added'
        ? 'Added'
        : category === 'fixed'
          ? 'Fixed'
          : category === 'security'
            ? 'Security'
            : 'Changed';

    const entryTitle = `${label} note ${version}`;
    const entryBody = `Customer-facing summary for ${version}.`;

    return {
      version,
      date: `2026-08-${String(index + 1).padStart(2, '0')}`,
      isLatest: index === 0,
      sections: [
        {
          id: category,
          label,
          entries: [{ title: entryTitle, body: entryBody, issueRefs: [`#${1400 + index}`] }],
        },
      ],
    } satisfies PublicRelease;
  });
});

vi.mock('@/components/landing/LandingHeader', () => ({
  default: () => <div data-testid="landing-header">Landing Header</div>,
}));

vi.mock('@/components/layout/LegalFooter', () => ({
  default: () => <div data-testid="legal-footer">Legal Footer</div>,
}));

vi.mock('@/lib/publicReleases', async () => {
  const actual = await import('@/lib/publicReleaseTypes');

  return {
    INITIAL_VISIBLE_PUBLIC_RELEASES: 10,
    PUBLIC_RELEASE_FILTER_LABELS: {
      all: 'All',
      features: 'Features',
      fixes: 'Fixes',
      security: 'Security',
    },
    PUBLIC_RELEASES: mockedReleases,
    releaseMatchesPublicReleaseFilter: actual.releaseMatchesPublicReleaseFilter,
    sectionMatchesPublicReleaseFilter: actual.sectionMatchesPublicReleaseFilter,
  };
});

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

  it('renders the latest release expanded and keeps older releases behind one control', () => {
    render(
      <MemoryRouter initialEntries={['/releases']}>
        <Routes>
          <Route path="/releases" element={<Releases />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Releases', level: 1 })).toBeInTheDocument();
    expect(screen.getByText('Latest')).toBeInTheDocument();
    expect(screen.getByText('Added note 3.0.12')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Show 2 older releases' })).toBeInTheDocument();
    expect(screen.queryByText('Changed note 3.0.1')).not.toBeInTheDocument();
  });

  it('filters the currently visible set with category chips', async () => {
    const user = userEvent.setup({ delay: null });

    render(
      <MemoryRouter initialEntries={['/releases']}>
        <Routes>
          <Route path="/releases" element={<Releases />} />
        </Routes>
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('radio', { name: 'Fixes' }));

    expect(screen.getByText('Fixed note 3.0.11')).toBeInTheDocument();
    expect(screen.queryByText('Added note 3.0.12')).not.toBeInTheDocument();
    expect(screen.queryByText('Changed note 3.0.1')).not.toBeInTheDocument();
  });

  it('reveals and scrolls to an older release when loading a hash deep link', async () => {
    render(
      <MemoryRouter initialEntries={['/releases#3.0.2']}>
        <Routes>
          <Route path="/releases" element={<Releases />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Fixed note 3.0.2')).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: 'Hide older releases' })).toBeInTheDocument();
    await waitFor(() => {
      expect(scrollIntoViewMock).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
    });
  });
});
