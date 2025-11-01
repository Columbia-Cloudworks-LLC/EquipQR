import { createContext } from "react";

import type { CacheStats, SyncStatus } from "@/types/cache";

export interface CacheManagerContextType {
  getCacheStats: () => CacheStats;
  clearCache: (pattern?: string) => void;
  getSyncStatus: () => SyncStatus;
}

export const CacheManagerContext = createContext<CacheManagerContextType | undefined>(
  undefined
);

