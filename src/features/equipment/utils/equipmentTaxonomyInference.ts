import {
  EPA_ENGINE_FAMILY_SEED,
  EPA_MANUFACTURER_CODE_MAP,
  EQUIPMENT_TAXONOMY_SEED,
  MANUFACTURER_ALIASES,
  type SpecInferenceSource,
} from '@/features/equipment/data/equipmentTaxonomySeed';
import type { ManufacturerModelsEntry } from '@/features/equipment/utils/manufacturerModelLookup';

export interface FleetSpecCacheEntry {
  manufacturer_norm: string;
  model_norm: string;
  manufacturer: string;
  model: string;
  category: string | null;
  subtype: string | null;
  specs: Record<string, string>;
  source: SpecInferenceSource;
  confidence: number;
}

export interface EquipmentSpecSuggestion {
  key: string;
  manufacturer: string;
  model: string;
  category: string | null;
  subtype: string | null;
  specs: Record<string, string>;
  source: SpecInferenceSource;
  confidence: number;
  summaryLabel: string;
}

/**
 * Normalizes manufacturer/model strings identically to inventory compatibility rules:
 * lowercase, trim, strip punctuation/spaces/hyphens.
 */
export function normalizeEquipmentToken(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

export function resolveCanonicalManufacturer(raw: string): string | null {
  const norm = normalizeEquipmentToken(raw);
  if (!norm) return null;
  if (MANUFACTURER_ALIASES[norm]) {
    return MANUFACTURER_ALIASES[norm];
  }
  const seedMatch = EQUIPMENT_TAXONOMY_SEED.find(
    (entry) => normalizeEquipmentToken(entry.manufacturer) === norm,
  );
  return seedMatch?.manufacturer ?? null;
}

/**
 * Splits a combined make+model fragment (e.g. "cat 320", "Caterpillar 320GC", "jd 310sl")
 * into canonical manufacturer + model token when typed into a single field.
 */
export function splitCombinedMakeModelFragment(raw: string): {
  manufacturer: string | null;
  modelFragment: string;
} {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { manufacturer: null, modelFragment: '' };
  }

  const parts = trimmed.split(/\s+/);
  if (parts.length >= 2) {
    const twoWordMfr = resolveCanonicalManufacturer(`${parts[0]} ${parts[1]}`);
    if (twoWordMfr && parts.length >= 3) {
      return {
        manufacturer: twoWordMfr,
        modelFragment: parts.slice(2).join(' '),
      };
    }
    const oneWordMfr = resolveCanonicalManufacturer(parts[0]);
    if (oneWordMfr) {
      return {
        manufacturer: oneWordMfr,
        modelFragment: parts.slice(1).join(' '),
      };
    }
  }

  return { manufacturer: null, modelFragment: trimmed };
}

export function inferEquipmentFromPartialInput(params: {
  manufacturerInput: string;
  modelInput: string;
  fleetCache?: FleetSpecCacheEntry[];
}): EquipmentSpecSuggestion | null {
  const rawMfr = params.manufacturerInput.trim();
  const rawModel = params.modelInput.trim();

  if (!rawMfr && !rawModel) return null;

  let canonicalMfr = resolveCanonicalManufacturer(rawMfr);
  let effectiveModelFragment = rawModel;

  // Support typing "cat 320" or "Caterpillar 320GC" into either Manufacturer or Model
  if (!rawModel && rawMfr) {
    const split = splitCombinedMakeModelFragment(rawMfr);
    if (split.manufacturer && split.modelFragment) {
      canonicalMfr = split.manufacturer;
      effectiveModelFragment = split.modelFragment;
    }
  } else if (rawModel) {
    const split = splitCombinedMakeModelFragment(rawModel);
    if (!canonicalMfr && split.manufacturer && split.modelFragment) {
      canonicalMfr = split.manufacturer;
      effectiveModelFragment = split.modelFragment;
    }
  }

  const mfrNorm = normalizeEquipmentToken(canonicalMfr ?? rawMfr);
  const modelNorm = normalizeEquipmentToken(effectiveModelFragment);
  const combinedNorm = normalizeEquipmentToken(`${rawMfr} ${rawModel}`);

  // 1. Check org-scoped fleet-as-cache first (shop source of truth wins)
  if (params.fleetCache && params.fleetCache.length > 0 && modelNorm) {
    const fleetHit = params.fleetCache.find(
      (entry) =>
        (!mfrNorm || entry.manufacturer_norm === mfrNorm) &&
        (entry.model_norm === modelNorm ||
          (modelNorm.length >= 3 && entry.model_norm.startsWith(modelNorm))),
    );
    if (fleetHit) {
      return {
        key: `shop:${fleetHit.manufacturer_norm}:${fleetHit.model_norm}`,
        manufacturer: fleetHit.manufacturer,
        model: fleetHit.model,
        category: fleetHit.category,
        subtype: fleetHit.subtype,
        specs: fleetHit.specs,
        source: 'shop',
        confidence: 1.0,
        summaryLabel: `${fleetHit.manufacturer} ${fleetHit.model}`,
      };
    }
  }

  // 2. Match against local taxonomy seed (exact alias or model match first, then prefix match)
  for (const entry of EQUIPMENT_TAXONOMY_SEED) {
    const entryMfrNorm = normalizeEquipmentToken(entry.manufacturer);
    const entryModelNorm = normalizeEquipmentToken(entry.model);
    const aliasNorms = entry.aliases.map(normalizeEquipmentToken);

    const manufacturerMatches = !mfrNorm || entryMfrNorm === mfrNorm;
    const exactModelOrAlias =
      (modelNorm && (entryModelNorm === modelNorm || aliasNorms.includes(modelNorm))) ||
      (combinedNorm && aliasNorms.includes(combinedNorm));

    if (manufacturerMatches && exactModelOrAlias) {
      return {
        key: `taxonomy:${entryMfrNorm}:${entryModelNorm}`,
        manufacturer: entry.manufacturer,
        model: entry.model,
        category: entry.category,
        subtype: entry.subtype,
        specs: entry.specs ?? {},
        source: 'taxonomy',
        confidence: 0.95,
        summaryLabel: `${entry.manufacturer} ${entry.model} (${entry.subtype})`,
      };
    }
  }

  // 3. Prefix match on model when at least 3 characters are typed
  if (modelNorm.length >= 3) {
    const prefixCandidate = EQUIPMENT_TAXONOMY_SEED.find((entry) => {
      const entryMfrNorm = normalizeEquipmentToken(entry.manufacturer);
      const entryModelNorm = normalizeEquipmentToken(entry.model);
      if (mfrNorm && entryMfrNorm !== mfrNorm) return false;
      return (
        entryModelNorm.startsWith(modelNorm) ||
        entry.aliases.some((alias) => normalizeEquipmentToken(alias).startsWith(modelNorm))
      );
    });

    if (prefixCandidate) {
      return {
        key: `taxonomy:${normalizeEquipmentToken(prefixCandidate.manufacturer)}:${normalizeEquipmentToken(prefixCandidate.model)}`,
        manufacturer: prefixCandidate.manufacturer,
        model: prefixCandidate.model,
        category: prefixCandidate.category,
        subtype: prefixCandidate.subtype,
        specs: prefixCandidate.specs ?? {},
        source: 'taxonomy',
        confidence: 0.85,
        summaryLabel: `${prefixCandidate.manufacturer} ${prefixCandidate.model} (${prefixCandidate.subtype})`,
      };
    }
  }

  // 4. Manufacturer-only alias normalization (e.g. user typed "cat" -> suggest "Caterpillar")
  if (
    canonicalMfr &&
    rawMfr &&
    canonicalMfr.toLowerCase() !== rawMfr.toLowerCase() &&
    !rawModel
  ) {
    return {
      key: `taxonomy:mfr:${normalizeEquipmentToken(canonicalMfr)}`,
      manufacturer: canonicalMfr,
      model: '',
      category: null,
      subtype: null,
      specs: {},
      source: 'taxonomy',
      confidence: 0.9,
      summaryLabel: `${canonicalMfr} (normalized manufacturer)`,
    };
  }

  return null;
}

export function mergeManufacturerModelSuggestions(
  fleetEntries: ManufacturerModelsEntry[],
  fleetCache: FleetSpecCacheEntry[] = [],
): ManufacturerModelsEntry[] {
  const byManufacturer = new Map<string, { displayName: string; models: Set<string> }>();

  const ensureEntry = (manufacturerName: string) => {
    const canonical = resolveCanonicalManufacturer(manufacturerName) ?? manufacturerName.trim();
    const key = canonical.toLowerCase();
    let existing = byManufacturer.get(key);
    if (!existing) {
      existing = { displayName: canonical, models: new Set<string>() };
      byManufacturer.set(key, existing);
    }
    return existing;
  };

  for (const fleetEntry of fleetEntries) {
    if (!fleetEntry.manufacturer?.trim()) continue;
    const bucket = ensureEntry(fleetEntry.manufacturer);
    for (const mdl of fleetEntry.models) {
      if (mdl?.trim()) bucket.models.add(mdl.trim());
    }
  }

  for (const cacheRow of fleetCache) {
    const bucket = ensureEntry(cacheRow.manufacturer);
    if (cacheRow.model?.trim()) bucket.models.add(cacheRow.model.trim());
  }

  for (const seed of EQUIPMENT_TAXONOMY_SEED) {
    const bucket = ensureEntry(seed.manufacturer);
    bucket.models.add(seed.model);
  }

  return Array.from(byManufacturer.values())
    .sort((a, b) => a.displayName.localeCompare(b.displayName))
    .map((entry) => ({
      manufacturer: entry.displayName,
      models: Array.from(entry.models).sort((a, b) => a.localeCompare(b)),
    }));
}

const VIN_TRANSLITERATION: Record<string, number> = {
  A: 1,
  B: 2,
  C: 3,
  D: 4,
  E: 5,
  F: 6,
  G: 7,
  H: 8,
  J: 1,
  K: 2,
  L: 3,
  M: 4,
  N: 5,
  P: 7,
  R: 9,
  S: 2,
  T: 3,
  U: 4,
  V: 5,
  W: 6,
  X: 7,
  Y: 8,
  Z: 9,
  '0': 0,
  '1': 1,
  '2': 2,
  '3': 3,
  '4': 4,
  '5': 5,
  '6': 6,
  '7': 7,
  '8': 8,
  '9': 9,
};

const VIN_WEIGHTS = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2] as const;

/**
 * Validates whether an input string is a genuine 17-character highway VIN (ISO 3779 / NHTSA).
 * Off-highway PINs (e.g. 8-char Cat serials or 17-char off-road PINs failing check digit)
 * are rejected so they are never sent to NHTSA vPIC.
 */
export function validateHighwayVin(
  rawInput: string,
): { valid: true; normalizedVin: string } | { valid: false; reason: string } {
  const cleaned = rawInput.trim().toUpperCase();
  if (cleaned.length !== 17) {
    return {
      valid: false,
      reason:
        'Not a 17-character highway VIN. Off-highway equipment serial numbers are not sent to NHTSA vPIC.',
    };
  }

  if (/[IOQ]/.test(cleaned) || !/^[A-HJ-NPR-Z0-9]{17}$/.test(cleaned)) {
    return {
      valid: false,
      reason:
        'Invalid VIN characters (I, O, and Q are not permitted in standard 17-character highway VINs).',
    };
  }

  let sum = 0;
  for (let i = 0; i < 17; i++) {
    const ch = cleaned[i];
    const value = VIN_TRANSLITERATION[ch];
    if (value === undefined) {
      return { valid: false, reason: 'Invalid VIN character sequence.' };
    }
    sum += value * VIN_WEIGHTS[i];
  }

  const remainder = sum % 11;
  const expectedCheckDigit = remainder === 10 ? 'X' : String(remainder);
  if (cleaned[8] !== expectedCheckDigit) {
    return {
      valid: false,
      reason:
        'Failed highway VIN check-digit verification. Off-highway PINs are not sent to NHTSA vPIC.',
    };
  }

  return { valid: true, normalizedVin: cleaned };
}

export function mapVpicResponseToSpecSuggestion(
  vin: string,
  vpicRow: Record<string, string | null | undefined>,
): EquipmentSpecSuggestion | null {
  const rawMake = (vpicRow.Make ?? '').trim();
  const rawModel = (vpicRow.Model ?? '').trim();
  const modelYear = (vpicRow.ModelYear ?? '').trim();
  const gvwr = (vpicRow.GVWR ?? '').trim();
  const bodyClass = (vpicRow.BodyClass ?? '').trim();
  const fuelType = (vpicRow.FuelTypePrimary ?? '').trim();

  if (!rawMake && !rawModel) {
    return null;
  }

  const canonicalMake =
    resolveCanonicalManufacturer(rawMake) ??
    rawMake
      .toLowerCase()
      .replace(/\b\w/g, (ch) => ch.toUpperCase());

  const specs: Record<string, string> = { vin };
  if (modelYear) specs.model_year = modelYear;
  if (gvwr) specs.gvwr = gvwr;
  if (bodyClass) specs.body_class = bodyClass;
  if (fuelType) specs.fuel_type = fuelType;

  return {
    key: `vpic:${vin}`,
    manufacturer: canonicalMake,
    model: rawModel || 'Highway Vehicle',
    category: 'Highway Vehicles',
    subtype: bodyClass || 'Commercial Vehicle',
    specs,
    source: 'vpic',
    confidence: 0.95,
    summaryLabel: `${modelYear ? `${modelYear} ` : ''}${canonicalMake} ${rawModel}`.trim(),
  };
}

/**
 * Looks up a 12-character EPA nonroad / heavy-duty engine family code from the emissions plate.
 */
export function lookupEpaEngineFamily(rawFamilyCode: string): EquipmentSpecSuggestion | null {
  const cleaned = rawFamilyCode.trim().toUpperCase();
  if (cleaned.length !== 12 || !/^[A-Z0-9]{4}[A-Z0-9.]{5}[A-Z0-9]{3}$/.test(cleaned)) {
    return null;
  }

  const exact = EPA_ENGINE_FAMILY_SEED.find((row) => row.familyCode === cleaned);
  if (exact) {
    return {
      key: `epa:${exact.familyCode}`,
      manufacturer: exact.manufacturer,
      model: '',
      category: null,
      subtype: null,
      specs: {
        epa_engine_family: exact.familyCode,
        engine_manufacturer: exact.manufacturer,
        engine_displacement_l: `${exact.displacementLiters}L`,
        hp_band: exact.hpBand,
        emissions_tier: exact.emissionsTier,
        fuel_type: exact.fuelType,
      },
      source: 'epa',
      confidence: 0.95,
      summaryLabel: `${exact.manufacturer} ${exact.displacementLiters}L • ${exact.emissionsTier} (${exact.hpBand})`,
    };
  }

  // Fallback pattern inference from standard 12-char EPA engine family structure:
  // Pos 1: Model year code, Pos 2-4: Manufacturer code (e.g. CEX, JDX, KBX, CPX), Pos 6-9: Displacement (e.g. 06.7)
  const mfrCode = cleaned.slice(1, 4);
  const inferredMfr = EPA_MANUFACTURER_CODE_MAP[mfrCode];
  const dispCandidate = cleaned.slice(5, 9);
  const parsedDisp = Number.parseFloat(dispCandidate);

  if (!inferredMfr && !Number.isFinite(parsedDisp)) {
    return null;
  }

  const dispString =
    Number.isFinite(parsedDisp) && parsedDisp > 0 && parsedDisp < 100
      ? `${parsedDisp}L`
      : undefined;

  const specs: Record<string, string> = {
    epa_engine_family: cleaned,
    emissions_tier: 'EPA Certified Nonroad / Heavy-Duty',
  };
  if (inferredMfr) specs.engine_manufacturer = inferredMfr;
  if (dispString) specs.engine_displacement_l = dispString;

  return {
    key: `epa:${cleaned}`,
    manufacturer: inferredMfr ?? '',
    model: '',
    category: null,
    subtype: null,
    specs,
    source: 'epa',
    confidence: 0.75,
    summaryLabel: `${inferredMfr ?? 'EPA Engine'} ${dispString ?? ''} (${cleaned})`.trim(),
  };
}
