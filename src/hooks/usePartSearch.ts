import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { searchParts } from '@/services/partsService';

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = (window as any).useState?.(value) ?? [value, () => {}];
  // Fallback simple memo (for SSR tests) if no window hook shim
  if (typeof window === 'undefined' || !(window as any).useEffect) return value;
  (window as any).useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

export function usePartSearch(params: { q: string; brand?: string; category?: string; limit?: number }) {
  const effectiveQ = (params.q || '').trim();
  const query = useMemo(() => ({ ...params, q: effectiveQ }), [params, effectiveQ]);
  return useQuery({
    queryKey: ['parts', 'search', query.q, query.brand, query.category, query.limit],
    queryFn: () => searchParts(query),
    enabled: effectiveQ.length > 0,
    staleTime: 5 * 60 * 1000,
  });
}
