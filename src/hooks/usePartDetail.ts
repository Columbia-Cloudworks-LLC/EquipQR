import { useQuery } from '@tanstack/react-query';
import { getPartDetail } from '@/services/partsService';

export function usePartDetail(id: string | undefined) {
  return useQuery({
    queryKey: ['parts', 'detail', id],
    queryFn: () => getPartDetail(id!),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}
