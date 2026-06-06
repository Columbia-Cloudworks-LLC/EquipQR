// fallow-ignore-file code-duplication
// Duplication rationale: Card layout repeats status and assignee chips across variants
/**
 * Unified Work Order Card Component
 *
 * Single source of truth for work order card rendering.
 * Supports desktop and mobile variants through a single component.
 *
 * @example
 * // Desktop variant (default)
 * <WorkOrderCard workOrder={order} onNavigate={handleNavigate} />
 *
 * // Mobile variant
 * <WorkOrderCard workOrder={order} variant="mobile" onNavigate={handleNavigate} />
 *
 * // Compact variant (for lists/grids)
 * <WorkOrderCard workOrder={order} variant="compact" onNavigate={handleNavigate} />
 */

import React, { memo } from 'react';
import type { WorkOrder } from '@/features/work-orders/types/workOrder';
import { WorkOrderDesktopCard } from './workOrderCard/WorkOrderDesktopCard';
import { WorkOrderMobileCard } from './workOrderCard/WorkOrderMobileCard';
import { WorkOrderCompactCard } from './workOrderCard/WorkOrderCompactCard';

export type WorkOrderCardVariant = 'desktop' | 'mobile' | 'compact';

export interface WorkOrderCardProps {
  /** The work order data to display */
  workOrder: WorkOrder;
  /** Layout variant */
  variant?: WorkOrderCardVariant;
  /** Navigation handler */
  onNavigate?: (id: string) => void;
  /** Accept button click handler (mobile) */
  onAcceptClick?: (workOrder: WorkOrder) => void;
  /** Status update handler */
  onStatusUpdate?: (workOrderId: string, newStatus: string) => void;
  /** Assign button click handler */
  onAssignClick?: () => void;
  /** Reopen button click handler */
  onReopenClick?: () => void;
  /** Is the card in updating state */
  isUpdating?: boolean;
  /** Is the accept action in progress */
  isAccepting?: boolean;
  /**
   * Hint that this card is in the initial viewport. When true, the
   * equipment thumbnail loads eagerly with `fetchpriority=high` so Chrome
   * does not defer it (and does not emit the
   * "Images loaded lazily and replaced with placeholders" intervention
   * warning). The list parent typically passes `index < 6`.
   */
  isAboveTheFold?: boolean;
}

const WorkOrderCard: React.FC<WorkOrderCardProps> = (props) => {
  const { variant = 'desktop' } = props;

  switch (variant) {
    case 'mobile':
      return <WorkOrderMobileCard {...props} />;
    case 'compact':
      return <WorkOrderCompactCard {...props} />;
    case 'desktop':
    default:
      return <WorkOrderDesktopCard {...props} />;
  }
};

export default memo(WorkOrderCard);
