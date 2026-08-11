export type EquipmentCardTransitionState = {
  activeEquipmentId: string | null;
  isListTransitioning: boolean;
};

const INITIAL_STATE: EquipmentCardTransitionState = {
  activeEquipmentId: null,
  isListTransitioning: false,
};

let state: EquipmentCardTransitionState = INITIAL_STATE;
const listeners = new Set<() => void>();

export function getEquipmentCardTransitionState(): EquipmentCardTransitionState {
  return state;
}

export function setEquipmentCardTransitionState(
  next: Partial<EquipmentCardTransitionState>,
): void {
  state = { ...state, ...next };
  listeners.forEach((listener) => listener());
}

export function clearEquipmentCardTransitionState(): void {
  state = { ...INITIAL_STATE };
  listeners.forEach((listener) => listener());
}

export function subscribeEquipmentCardTransitionState(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Test helper — resets module state between cases. */
export function resetEquipmentCardTransitionStoreForTests(): void {
  state = { ...INITIAL_STATE };
  listeners.clear();
}
