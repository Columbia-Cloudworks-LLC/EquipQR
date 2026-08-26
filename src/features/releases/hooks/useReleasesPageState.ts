import { useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { useLocation } from 'react-router-dom';
import {
  INITIAL_VISIBLE_PUBLIC_RELEASES,
  PUBLIC_RELEASES,
  releaseMatchesPublicReleaseFilter,
  sectionMatchesPublicReleaseFilter,
} from '@/features/releases/lib/publicReleases';
import type {
  PublicRelease,
  PublicReleaseFilter,
  PublicReleaseSection,
} from '@/features/releases/lib/publicReleaseTypes';
import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion';

const MAX_HASH_SCROLL_ATTEMPTS = 60;

export function isPublicReleaseFilter(value: string): value is PublicReleaseFilter {
  return value === 'all' || value === 'features' || value === 'fixes' || value === 'security';
}

export function getVisibleSections(
  release: PublicRelease,
  filter: PublicReleaseFilter,
): readonly PublicReleaseSection[] {
  return release.sections.filter((section) =>
    sectionMatchesPublicReleaseFilter(section.id, filter),
  );
}

export function countVisibleEntries(
  release: PublicRelease,
  filter: PublicReleaseFilter,
): number {
  return release.sections.reduce((count, section) => {
    if (!sectionMatchesPublicReleaseFilter(section.id, filter)) {
      return count;
    }

    return count + section.entries.length;
  }, 0);
}

export type UseReleasesPageStateResult = {
  isEmptyFilteredState: boolean;
  olderReleaseCount: number;
  openReleases: string[];
  selectedFilter: PublicReleaseFilter;
  setOpenReleases: Dispatch<SetStateAction<string[]>>;
  setSelectedFilter: Dispatch<SetStateAction<PublicReleaseFilter>>;
  setShowOlderReleases: Dispatch<SetStateAction<boolean>>;
  showOlderReleases: boolean;
  visibleReleases: readonly PublicRelease[];
};

export function useReleasesPageState(): UseReleasesPageStateResult {
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

  const isEmptyFilteredState = selectedFilter !== 'all' && visibleReleases.length === 0;

  return {
    isEmptyFilteredState,
    olderReleaseCount,
    openReleases,
    selectedFilter,
    setOpenReleases,
    setSelectedFilter,
    setShowOlderReleases,
    showOlderReleases,
    visibleReleases,
  };
}
