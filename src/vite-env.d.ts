/// <reference types="vite/client" />
/// <reference types="vitest/client" />

import type { PublicRelease } from '@/lib/publicReleaseTypes';

declare const __APP_VERSION__: string;
declare const __PUBLIC_RELEASES__: readonly PublicRelease[];