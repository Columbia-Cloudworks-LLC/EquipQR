import { useQuery } from '@tanstack/react-query'
import { workOrders } from '@/lib/queryKeys'
import { getFilteredList } from '@/features/work-orders/services/workOrderListService'
import type {
  WorkOrderListContract,
  WorkOrderListPagination,
  WorkOrderListResult,
} from '@/features/work-orders/utils/workOrderListContract'

export function useWorkOrderList(
  contract: WorkOrderListContract | undefined,
  pagination: WorkOrderListPagination,
  options?: { enabled?: boolean },
) {
  const enabled = (options?.enabled ?? true) && Boolean(contract)

  return useQuery<WorkOrderListResult>({
    queryKey: contract
      ? workOrders.pagedList(contract.organizationId, { contract, pagination })
      : workOrders.pagedList('unknown'),
    queryFn: () => {
      if (!contract) {
        return { data: [], count: 0 }
      }
      return getFilteredList(contract, pagination)
    },
    enabled,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
    placeholderData: (previousData) => previousData,
  })
}
