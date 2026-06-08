import type { PartIdentifierType } from '@/features/inventory/types/inventory';

export const IDENTIFIER_TYPES: { value: PartIdentifierType; label: string }[] = [
  { value: 'oem', label: 'OEM Part Number' },
  { value: 'aftermarket', label: 'Aftermarket Part Number' },
  { value: 'mpn', label: 'Manufacturer Part Number' },
  { value: 'upc', label: 'UPC Code' },
  { value: 'cross_ref', label: 'Cross-Reference Number' },
  { value: 'sku', label: 'Internal SKU' },
];
