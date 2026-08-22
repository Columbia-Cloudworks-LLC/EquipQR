import { Suspense, type ReactNode } from 'react';
import { textRouteFallback } from '@/routes/routerConfig';

export const LazyRoute = ({ children }: { children: ReactNode }) => (
  <Suspense fallback={textRouteFallback}>{children}</Suspense>
);
