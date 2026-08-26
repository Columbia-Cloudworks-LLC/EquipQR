import { useEffect, useMemo, useRef, useState, type JSX } from 'react';
import { useLocation } from 'react-router-dom';
import LandingHeader from '@/components/landing/LandingHeader';
import LegalFooter from '@/components/layout/LegalFooter';
import { PageBackButton } from '@/components/layout/PageBackButton';
import { PageSEO } from '@/components/seo/PageSEO';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import EmptyState from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion';
import {
  INITIAL_VISIBLE_PUBLIC_RELEASES,
  PUBLIC_RELEASES,
  PUBLIC_RELEASE_FILTER_LABELS,
  releaseMatchesPublicReleaseFilter,
  sectionMatchesPublicReleaseFilter,
} from '@/lib/publicReleases';
import type { PublicRelease, PublicReleaseFilter, PublicReleaseSection } from '@/lib/publicReleaseTypes';

const FILTER_ORDER: readonly PublicReleaseFilter[] = ['all', 'features', 'fixes', 'security'];
const MAX_HASH_SCROLL_ATTEMPTS = 60;

function isPublicReleaseFilter(value: string): value is PublicReleaseFilter {
  return FILTER_ORDER.some((filter) => filter === value);
}

function formatReleaseDate(date: string): string {
  const parsed = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) {
    return date;
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(parsed);
}

function countVisibleEntries(release: PublicRelease, filter: PublicReleaseFilter): number {
  return release.sections.reduce((count, section) => {
    if (!sectionMatchesPublicReleaseFilter(section.id, filter)) {
      return count;
    }

    return count + section.entries.length;
  }, 0);
}

function getVisibleSections(release: PublicRelease, filter: PublicReleaseFilter) {
  return release.sections.filter((section) => sectionMatchesPublicReleaseFilter(section.id, filter));
}

export function Releases(): JSX.Element {
  const location = useLocation();
  const prefersReducedMotion = usePrefersReducedMotion();
  const prefersReducedMotionRef = useRef(prefersReducedMotion);
  prefersReducedMotionRef.current = prefersReducedMotion;

  const [selectedFilter, setSelectedFilter] = useState<PublicReleaseFilter>('all');
  const [showOlderReleases, setShowOlderReleases] = useState(false);
  const [openReleases, setOpenReleases] = useState<string[]>(() =>
    PUBLIC_RELEASES.slice(0, INITIAL_VISIBLE_PUBLIC_RELEASES).map((release) => release.version),
  );

  const olderReleaseCount = Math.max(0, PUBLIC_RELEASES.length - INITIAL_VISIBLE_PUBLIC_RELEASES);

  useEffect(() => {
    const rawHash = location.hash;
    if (!rawHash) {
      return;
    }

    const encodedVersion = rawHash.startsWith('#') ? rawHash.slice(1) : rawHash;
    if (!encodedVersion) {
      return;
    }

    let version: string;
    try {
      version = decodeURIComponent(encodedVersion);
    } catch {
      return;
    }

    const releaseIndex = PUBLIC_RELEASES.findIndex((release) => release.version === version);
    if (releaseIndex === -1) {
      return;
    }

    setSelectedFilter('all');
    if (releaseIndex >= INITIAL_VISIBLE_PUBLIC_RELEASES) {
      setShowOlderReleases(true);
    }
    setOpenReleases((currentOpenReleases) =>
      currentOpenReleases.includes(version)
        ? currentOpenReleases
        : [...currentOpenReleases, version],
    );

    let cancelled = false;
    let attempts = 0;

    const tryScroll = (): void => {
      if (cancelled || attempts++ > MAX_HASH_SCROLL_ATTEMPTS) {
        return;
      }

      const target = document.getElementById(version);
      if (!target) {
        requestAnimationFrame(tryScroll);
        return;
      }

      target.scrollIntoView({
        behavior: prefersReducedMotionRef.current ? 'auto' : 'smooth',
        block: 'start',
      });
    };

    requestAnimationFrame(tryScroll);
    return () => {
      cancelled = true;
    };
  }, [location.hash]);

  const visibleBaseReleases = useMemo(
    () =>
      showOlderReleases
        ? PUBLIC_RELEASES
        : PUBLIC_RELEASES.slice(0, INITIAL_VISIBLE_PUBLIC_RELEASES),
    [showOlderReleases],
  );

  const visibleReleases = useMemo(
    () =>
      visibleBaseReleases.filter((release) =>
        releaseMatchesPublicReleaseFilter(release, selectedFilter),
      ),
    [selectedFilter, visibleBaseReleases],
  );

  return (
    <>
      <PageSEO
        title="Releases · EquipQR"
        description="Customer-facing changes in each published EquipQR release."
        path="/releases"
      />
      <div className="flex min-h-screen flex-col bg-background">
        <LandingHeader />
        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <section className="border-b border-border/50 bg-linear-to-br from-background via-background to-primary/5 pb-10 pt-32">
            <div className="container mx-auto max-w-5xl px-4">
              <PageBackButton className="mb-6" />
              <div className="space-y-4">
                <p className="text-sm font-medium uppercase tracking-wide text-primary">
                  Public release history
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <h1
                    data-route-heading="true"
                    tabIndex={-1}
                    className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl"
                  >
                    Releases
                  </h1>
                  <Badge variant="secondary" className="text-xs uppercase tracking-wide">
                    Build-time from `CHANGELOG.md`
                  </Badge>
                </div>
                <p className="max-w-3xl text-base text-muted-foreground sm:text-lg">
                  Customer-facing changes in each published EquipQR release. We omit the in-progress
                  Unreleased section and collapse internal-only maintenance so this page stays useful
                  to operators, admins, and evaluators.
                </p>
              </div>
            </div>
          </section>

          <section className="border-b border-border/50 bg-background/95">
            <div className="container mx-auto max-w-5xl px-4 py-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">Filter visible releases</p>
                  <p className="text-xs text-muted-foreground">
                    Chips apply to the releases currently shown on the page.
                  </p>
                </div>
                <ToggleGroup
                  type="single"
                  value={selectedFilter}
                  onValueChange={(value) => {
                    if (!value || !isPublicReleaseFilter(value)) {
                      return;
                    }
                    setSelectedFilter(value);
                  }}
                  size="sm"
                  variant="outline"
                  aria-label="Release note filters"
                  className="flex flex-wrap justify-start sm:justify-end"
                >
                  {FILTER_ORDER.map((filter) => (
                    <ToggleGroupItem key={filter} value={filter} aria-label={PUBLIC_RELEASE_FILTER_LABELS[filter]}>
                      {PUBLIC_RELEASE_FILTER_LABELS[filter]}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </div>
            </div>
          </section>

          <section className="py-8">
            <div className="container mx-auto max-w-5xl space-y-4 px-4">
              <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
                <p>
                  Showing {visibleReleases.length} release{visibleReleases.length === 1 ? '' : 's'}
                  {selectedFilter === 'all' ? '' : ` with ${PUBLIC_RELEASE_FILTER_LABELS[selectedFilter].toLowerCase()} notes`}
                  .
                </p>
                {olderReleaseCount > 0 ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowOlderReleases((currentValue) => !currentValue)}
                  >
                    {showOlderReleases
                      ? 'Hide older releases'
                      : `Show ${olderReleaseCount} older release${olderReleaseCount === 1 ? '' : 's'}`}
                  </Button>
                ) : null}
              </div>

              {visibleReleases.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border/70 bg-card/40 px-5 py-6 text-sm text-muted-foreground">
                  No {PUBLIC_RELEASE_FILTER_LABELS[selectedFilter].toLowerCase()} notes are visible in the
                  current release set.
                </div>
              ) : (
                <Accordion
                  type="multiple"
                  value={openReleases}
                  onValueChange={setOpenReleases}
                  className="space-y-4"
                >
                  {visibleReleases.map((release) => {
                    const visibleSections = getVisibleSections(release, selectedFilter);
                    const visibleEntryCount = countVisibleEntries(release, selectedFilter);

                    return (
                      <AccordionItem
                        key={release.version}
                        value={release.version}
                        id={release.version}
                        className={`overflow-hidden rounded-2xl border border-border/60 bg-card shadow-xs ${
                          release.isLatest ? 'border-primary/50 bg-primary/5' : ''
                        }`}
                      >
                        <AccordionTrigger className="gap-4 px-5 py-5 text-left hover:no-underline">
                          <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="min-w-0 space-y-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-lg font-semibold text-foreground">
                                  v{release.version}
                                </span>
                                {release.isLatest ? (
                                  <Badge className="bg-primary text-primary-foreground hover:bg-primary">
                                    Latest
                                  </Badge>
                                ) : null}
                                {visibleEntryCount > 0 ? (
                                  <Badge variant="secondary">
                                    {visibleEntryCount} update{visibleEntryCount === 1 ? '' : 's'}
                                  </Badge>
                                ) : null}
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {release.date ? formatReleaseDate(release.date) : 'Release date unavailable'}
                              </p>
                            </div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-5 pb-5">
                          {visibleSections.length === 0 ? (
                            <p className="text-sm leading-6 text-muted-foreground">
                              No customer-facing release notes were published for this version.
                            </p>
                          ) : (
                            <div className="space-y-5">
                              {visibleSections.map((section) => (
                                <section key={`${release.version}-${section.id}`} aria-labelledby={`${release.version}-${section.id}`}>
                                  <h2
                                    id={`${release.version}-${section.id}`}
                                    className="mb-2 text-sm font-semibold uppercase tracking-wide text-foreground"
                                  >
                                    {section.label}
                                  </h2>
                                  <ul className="space-y-2">
                                    {section.entries.map((entry, index) => (
                                      <li
                                        key={`${release.version}-${section.id}-${index}`}
                                        className="text-sm leading-6 text-foreground"
                                      >
                                        {entry.title ? (
                                          <>
                                            <span className="font-semibold">{entry.title}</span>
                                            {entry.body ? (
                                              <>
                                                {' '}
                                                —{' '}
                                                <span className="text-muted-foreground">{entry.body}</span>
                                              </>
                                            ) : null}
                                          </>
                                        ) : (
                                          <span className="text-muted-foreground">{entry.body}</span>
                                        )}
                                      </li>
                                    ))}
                                  </ul>
                                </section>
                              ))}
                            </div>
                          )}
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
              )}
            </div>
          </section>
        </main>
        <LegalFooter />
      </div>
    </>
  );
}
alFooter />
      </div>
    </>
  );
}
