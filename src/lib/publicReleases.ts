import type { PublicRelease } from '@/lib/publicReleaseTypes';

export {
  INITIAL_VISIBLE_PUBLIC_RELEASES,
  PUBLIC_RELEASE_FILTER_LABELS,
  releaseMatchesPublicReleaseFilter,
  sectionMatchesPublicReleaseFilter,
} from '@/lib/publicReleaseTypes';

export const PUBLIC_RELEASES: readonly PublicRelease[] = __PUBLIC_RELEASES__;
