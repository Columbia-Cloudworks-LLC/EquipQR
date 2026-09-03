/// <reference types="vite/client" />
/// <reference types="vitest/client" />

declare const __APP_VERSION__: string;
declare const __PUBLIC_RELEASES__: readonly import('@/features/releases/lib/publicReleaseTypes').PublicRelease[];

interface ImportMetaEnv {
  readonly VITE_PREVIEW_QUICK_LOGIN?: string;
}