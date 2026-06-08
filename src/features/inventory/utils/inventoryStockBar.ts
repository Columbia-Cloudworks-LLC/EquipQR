export type InventoryStockBarState = {
  fillPercent: number;
  notchPercent: number;
  ariaLabel: string;
};

const OVERSTOCK_LOG_MULTIPLIER = 18;
const OVERSTOCK_MAX_SHIFT = 70;

/**
 * Maps on-hand quantity to bar fill and threshold-notch position.
 * Below threshold: fill grows linearly toward the notch at the right edge.
 * At or above threshold: fill stays full; notch moves left logarithmically by overstock ratio.
 */
export function computeInventoryStockBarState(
  quantityOnHand: number,
  lowStockThreshold: number,
): InventoryStockBarState {
  const threshold = Math.max(lowStockThreshold, 1);
  const quantity = quantityOnHand;

  if (quantity <= 0) {
    return {
      fillPercent: 0,
      notchPercent: 100,
      ariaLabel: `${quantity} on hand, low stock threshold ${threshold}`,
    };
  }

  const ratio = quantity / threshold;

  if (ratio <= 1) {
    const fillPercent = Math.round(ratio * 100);
    return {
      fillPercent,
      notchPercent: 100,
      ariaLabel: `${quantity} on hand, low stock threshold ${threshold}, ${fillPercent}% of threshold`,
    };
  }

  const overstockShift = Math.min(
    OVERSTOCK_MAX_SHIFT,
    Math.log2(ratio) * OVERSTOCK_LOG_MULTIPLIER,
  );
  const notchPercent = Math.round(100 - overstockShift);
  const roundedRatio = Math.round(ratio * 10) / 10;

  return {
    fillPercent: 100,
    notchPercent,
    ariaLabel: `${quantity} on hand, low stock threshold ${threshold}, ${roundedRatio}x over threshold`,
  };
}
