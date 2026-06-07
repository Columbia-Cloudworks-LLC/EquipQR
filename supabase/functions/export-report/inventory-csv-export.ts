/**
 * Inventory CSV export.
 */

import { buildCsvTable, escapeCSVValue } from "../_shared/csv-export.ts";
import { formatDate } from "../_shared/export-formatters.ts";
import type { ExportFilters, ExportResult, UserSupabaseClient } from "./rate-limit.ts";
import { MAX_ROWS } from "./rate-limit.ts";

export function formatUnitCost(cents: number | null): string {
  if (cents === null) return "";
  return `$${(cents / 100).toFixed(2)}`;
}

export function computeIsLowStock(quantityOnHand: number, lowStockThreshold: number): string {
  return quantityOnHand <= lowStockThreshold ? "Yes" : "No";
}

export async function exportInventory(
  supabase: UserSupabaseClient,
  organizationId: string,
  filters: ExportFilters,
  columns: string[],
): Promise<ExportResult> {
  let query = supabase
    .from("inventory_items")
    .select(`
      id,
      name,
      description,
      sku,
      external_id,
      quantity_on_hand,
      low_stock_threshold,
      default_unit_cost,
      location,
      image_url,
      created_at
    `)
    .eq("organization_id", organizationId)
    .order("name")
    .limit(MAX_ROWS);

  if (filters.location) {
    query = query.ilike("location", `%${filters.location}%`);
  }

  const { data: inventory, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch inventory: ${error.message}`);
  }

  if (!inventory || inventory.length === 0) {
    return { csvContent: "No data found", rowCount: 0 };
  }

  const columnMap: Record<string, (item: Record<string, unknown>) => string> = {
    name: (item) => escapeCSVValue(item.name),
    description: (item) => escapeCSVValue(item.description),
    sku: (item) => escapeCSVValue(item.sku),
    external_id: (item) => escapeCSVValue(item.external_id),
    quantity_on_hand: (item) => escapeCSVValue(item.quantity_on_hand),
    low_stock_threshold: (item) => escapeCSVValue(item.low_stock_threshold),
    default_unit_cost: (item) => formatUnitCost(item.default_unit_cost as number | null),
    location: (item) => escapeCSVValue(item.location),
    is_low_stock: (item) => computeIsLowStock(
      item.quantity_on_hand as number,
      item.low_stock_threshold as number,
    ),
    created_at: (item) => formatDate(item.created_at as string),
  };

  const columnLabels: Record<string, string> = {
    name: "Name",
    description: "Description",
    sku: "SKU",
    external_id: "External ID",
    quantity_on_hand: "Quantity",
    low_stock_threshold: "Low Stock Threshold",
    default_unit_cost: "Unit Cost",
    location: "Location",
    is_low_stock: "Low Stock",
    created_at: "Created Date",
  };

  return {
    csvContent: buildCsvTable(inventory, columns, columnMap, columnLabels),
    rowCount: inventory.length,
  };
}

export const __inventoryCsvTestables = {
  formatUnitCost,
  computeIsLowStock,
};
