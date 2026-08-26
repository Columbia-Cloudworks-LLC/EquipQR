export const PUBLIC_RELEASE_FILTER_LABELS = {
  all: 'All',
  features: 'Features',
  fixes: 'Fixes',
  security: 'Security',
} as const;

export type PublicReleaseFilter = keyof typeof PUBLIC_RELEASE_FILTER_LABELS;

export const PUBLIC_RELEASE_SECTION_LABELS = {
  added: 'Added',
  changed: 'Changed',
  deprecated: 'Deprecated',
  removed: 'Removed',
  fixed: 'Fixed',
  security: 'Security',
} as const;

export type PublicReleaseKnownSectionId = keyof typeof PUBLIC_RELEASE_SECTION_LABELS;
export type PublicReleaseSectionId = PublicReleaseKnownSectionId | (string & {});

export type PublicReleaseEntry = {
  title: string | null;
  body: string;
  issueRefs: readonly string[];
};

export type PublicReleaseSection = {
  id: PublicReleaseSectionId;
  label: string;
  entries: readonly PublicReleaseEntry[];
};

export type PublicRelease = {
  version: string;
  date: string;
  isLatest: boolean;
  sections: readonly PublicReleaseSection[];
};

export const INITIAL_VISIBLE_PUBLIC_RELEASES = 10;

export function sectionMatchesPublicReleaseFilter(
  sectionId: PublicReleaseSectionId,
  filter: PublicReleaseFilter,
): boolean {
  switch (filter) {
    case 'all':
      return true;
    case 'features':
      return sectionId !== 'fixed' && sectionId !== 'security';
    case 'fixes':
      return sectionId === 'fixed';
    case 'security':
      return sectionId === 'security';
    default: {
      const exhaustive: never = filter;
      return exhaustive;
    }
  }
}

export function releaseMatchesPublicReleaseFilter(
  release: PublicRelease,
  filter: PublicReleaseFilter,
): boolean {
  if (filter === 'all') {
    return true;
  }

  return release.sections.some((section) => sectionMatchesPublicReleaseFilter(section.id, filter));
}
