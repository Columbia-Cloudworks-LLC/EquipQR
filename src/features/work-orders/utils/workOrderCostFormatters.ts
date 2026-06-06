const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
});

export function formatWorkOrderCostCurrency(cents: number): string {
  return currencyFormatter.format(cents / 100);
}

export function parseUnitPriceDollarsToCents(value: string): number {
  return Math.round((parseFloat(value) || 0) * 100);
}
