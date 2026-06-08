import { useCallback, useMemo } from 'react';

export type ManufacturerModelsEntry = {
  manufacturer: string;
  models: string[];
};

/** Build a case-insensitive manufacturer → models lookup map. */
export function buildManufacturerModelsMap(
  manufacturersData: ManufacturerModelsEntry[],
): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const mfr of manufacturersData) {
    map.set(mfr.manufacturer.toLowerCase(), mfr.models);
  }
  return map;
}

export function getManufacturerNames(manufacturersData: ManufacturerModelsEntry[]): string[] {
  return manufacturersData.map((m) => m.manufacturer);
}

export function getModelsForManufacturerFromMap(
  manufacturerModelsMap: Map<string, string[]>,
  manufacturer: string,
): string[] {
  return manufacturerModelsMap.get(manufacturer.toLowerCase()) || [];
}

/** Shared manufacturer/model dropdown data for compatibility rule editors. */
export function useManufacturerModelLookup(manufacturersData: ManufacturerModelsEntry[]) {
  const manufacturerModelsMap = useMemo(
    () => buildManufacturerModelsMap(manufacturersData),
    [manufacturersData],
  );

  const manufacturers = useMemo(
    () => getManufacturerNames(manufacturersData),
    [manufacturersData],
  );

  const getModelsForManufacturer = useCallback(
    (manufacturer: string): string[] =>
      getModelsForManufacturerFromMap(manufacturerModelsMap, manufacturer),
    [manufacturerModelsMap],
  );

  return { manufacturerModelsMap, manufacturers, getModelsForManufacturer };
}

/** Autocomplete manufacturer list + models for the active manufacturer field value. */
export function useManufacturerModelSuggestions(
  manufacturersData: ManufacturerModelsEntry[],
  manufacturer: string | undefined,
) {
  const { manufacturers, getModelsForManufacturer } = useManufacturerModelLookup(manufacturersData);
  const modelsForManufacturer = useMemo(
    () => (manufacturer ? getModelsForManufacturer(manufacturer) : []),
    [manufacturer, getModelsForManufacturer],
  );
  return { manufacturers, modelsForManufacturer };
}
