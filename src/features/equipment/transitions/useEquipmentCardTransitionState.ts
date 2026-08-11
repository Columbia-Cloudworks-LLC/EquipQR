import { useSyncExternalStore } from 'react';
import {
  getEquipmentCardTransitionState,
  subscribeEquipmentCardTransitionState,
  type EquipmentCardTransitionState,
} from '@/features/equipment/transitions/equipmentCardTransitionStore';

const getServerSnapshot = (): EquipmentCardTransitionState => ({
  activeEquipmentId: null,
  isListTransitioning: false,
});

/** Subscribe to the equipment card → details transition store. */
export function useEquipmentCardTransitionState(): EquipmentCardTransitionState {
  return useSyncExternalStore(
    subscribeEquipmentCardTransitionState,
    getEquipmentCardTransitionState,
    getServerSnapshot,
  );
}
