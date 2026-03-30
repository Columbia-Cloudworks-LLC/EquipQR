import { useQuery } from '@tanstack/react-query';
import { fetchDsrQueue } from '@/features/dsr/api/dsrApi';

export function useDsrQueue(organizationId: string | null) {
  return useQuery({
    queryKey: ['dsr', 'queue', organizationId],
    queryFn: () => fetchDsrQueue(organizationId as string),
    enabled: Boolean(organizationId),
    staleTime: 30_000,
  });
}
