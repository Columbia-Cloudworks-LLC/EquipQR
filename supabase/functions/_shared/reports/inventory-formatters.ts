/**
 * Inventory and alternate-group stock formatting helpers (#1192).
 */

export function formatUnitCost(cents: number | null): string {
  if (cents === null) return "";
  return `$${(cents / 100).toFixed(2)}`;
}

export function computeIsLowStock(quantityOnHand: number, lowStockThreshold: number): string {
  return quantityOnHand <= lowStockThreshold ? "Yes" : "No";
}

export function formatPrimaryFlag(isPrimary: boolean): string {
  return isPrimary ? "Yes" : "No";
}

export function resolveMemberType(inventoryItemId: string | null): string {
  return inventoryItemId ? "Inventory Item" : "Part Identifier";
}
