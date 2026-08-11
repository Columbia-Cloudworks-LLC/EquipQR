import type { ReactNode } from 'react';
import { useEquipmentCardTransitionState } from '@/features/equipment/transitions/useEquipmentCardTransitionState';

type EquipmentListTransitionRootProps = {
  children: ReactNode;
  className?: string;
};

/**
 * Marks the equipment list subtree while a card→details transition is in progress
 * so CSS can fade non-active cards and list chrome (sidebar/topbar stay untouched).
 */
export function EquipmentListTransitionRoot({
  children,
  className,
}: EquipmentListTransitionRootProps) {
  const { isListTransitioning } = useEquipmentCardTransitionState();

  return (
    <div
      className={className}
      data-equipment-list-transition-root=""
      {...(isListTransitioning ? { 'data-equipment-list-transitioning': '' } : {})}
    >
      {children}
    </div>
  );
}
