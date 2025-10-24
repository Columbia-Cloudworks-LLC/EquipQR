import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { searchParts } from '@/services/partsService';



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
