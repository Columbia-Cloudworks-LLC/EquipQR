import type { PMChecklistItem } from '@/features/pm-templates/services/preventativeMaintenanceService'

export const getItemStatus = (item: PMChecklistItem): 'not_rated' | 'ok' | 'adjusted' | 'recommend_repairs' | 'requires_immediate_repairs' | 'unsafe_condition' => {
  if (!item.condition) return 'not_rated'
  
  switch (item.condition) {
    case 1:
      return 'ok'
    case 2:
      return 'adjusted'
    case 3:
      return 'recommend_repairs'
    case 4:
      return 'requires_immediate_repairs'
    case 5:
      return 'unsafe_condition'
    default:
      return 'not_rated'
  }
}

/**
 * Converts a status enum to human-readable text
 */
export const getStatusText = (status: 'not_rated' | 'ok' | 'adjusted' | 'recommend_repairs' | 'requires_immediate_repairs' | 'unsafe_condition'): string => {
  switch (status) {
    case 'ok':
      return 'OK'
    case 'adjusted':
      return 'Adjusted'
    case 'recommend_repairs':
      return 'Recommend Repairs'
    case 'requires_immediate_repairs':
      return 'Requires Immediate Repairs'
    case 'unsafe_condition':
      return 'Unsafe Condition'
    case 'not_rated':
    default:
      return 'Not Rated'
  }
}

export const createSegmentsForSection = (items: PMChecklistItem[]) => {
  return items.map(item => ({
    id: item.id,
    status: getItemStatus(item)
  }))
}