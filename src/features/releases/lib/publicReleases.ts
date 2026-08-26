import type { PublicRelease } from '@/features/releases/lib/publicReleaseTypes';

export {
  INITIAL_VISIBLE_PUBLIC_RELEASES,
  PUBLIC_RELEASE_FILTER_LABELS,
  releaseMatchesPublicReleaseFilter,
  sectionMatchesPublicReleaseFilter,
} from '@/features/releases/lib/publicReleaseTypes';

export const PUBLIC_RELEASES: readonly PublicRelease[] = __PUBLIC_RELEASES__;
