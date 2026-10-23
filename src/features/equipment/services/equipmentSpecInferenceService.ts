import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';
import type { SpecInferenceSource } from '@/features/equipment/data/equipmentTaxonomySeed';
import {
  mapVpicResponseToSpecSuggestion,
  normalizeEquipmentToken,
  validateHighwayVin,
  type EquipmentSpecSuggestion,
  type FleetSpecCacheEntry,
} from '@/features/equipment/utils/equipmentTaxonomyInference';

const vpicMemoryCache = new Map<string, EquipmentSpecSuggestion>();

function normalizeSpecSource(raw: string): SpecInferenceSource {
  if (raw === 'taxonomy' || raw === 'vpic' || raw === 'epa' || raw === 'shop') {
    return raw;
  }
  return 'shop';
}

function parseSpecsJson(raw: unknown): Record<string, string> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {};
  }
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (typeof v === 'string' && v.trim()) {
      out[k] = v.trim();
    } else if (typeof v === 'number' || typeof v === 'boolean') {
      out[k] = String(v);
    }
  }
  return out;
}

export async function getOrganizationEquipmentSpecCache(
  organizationId: string,
): Promise<FleetSpecCacheEntry[]> {
  try {
    const { data, error } = await supabase
      .from('organization_equipment_spec_cache')
      .select('*')
      .eq('organization_id', organizationId)
      .order('confirmed_at', { ascending: false });

    if (error) throw error;

    return (data ?? []).map((row) => ({
      manufacturer_norm: row.manufacturer_norm,
      model_norm: row.model_norm,
      manufacturer: row.manufacturer,
      model: row.model,
      category: row.category,
      subtype: row.subtype,
      specs: parseSpecsJson(row.specs),
      source: normalizeSpecSource(row.source),
      confidence: Number(row.confidence ?? 1),
    }));
  } catch (error) {
    logger.warn('Failed to load organization equipment spec cache:', error);
    return [];
  }
}

export async function upsertOrganizationEquipmentSpecCache(params: {
  organizationId: string;
  userId: string;
  manufacturer: string;
  model: string;
  category?: string | null;
  subtype?: string | null;
  specs?: Record<string, string>;
  source?: SpecInferenceSource;
  confidence?: number;
}): Promise<void> {
  const manufacturerNorm = normalizeEquipmentToken(params.manufacturer);
  const modelNorm = normalizeEquipmentToken(params.model);
  if (!manufacturerNorm || !modelNorm) return;

  try {
    const nowIso = new Date().toISOString();
    const { error } = await supabase
      .from('organization_equipment_spec_cache')
      .upsert(
        {
          organization_id: params.organizationId,
          manufacturer_norm: manufacturerNorm,
          model_norm: modelNorm,
          manufacturer: params.manufacturer.trim(),
          model: params.model.trim(),
          category: params.category ?? null,
          subtype: params.subtype ?? null,
          specs: params.specs ?? {},
          source: params.source ?? 'shop',
          confidence: params.confidence ?? 1.0,
          confirmed_by: params.userId,
          confirmed_at: nowIso,
          updated_at: nowIso,
        },
        {
          onConflict: 'organization_id,manufacturer_norm,model_norm',
        },
      );

    if (error) {
      logger.warn('Failed to upsert organization equipment spec cache:', error);
    }
  } catch (error) {
    logger.warn('Failed to upsert organization equipment spec cache:', error);
  }
}

export async function decodeHighwayVinViaVpic(
  rawVin: string,
): Promise<
  | { ok: true; suggestion: EquipmentSpecSuggestion }
  | { ok: false; message: string }
> {
  const validation = validateHighwayVin(rawVin);
  if (!validation.valid) {
    return { ok: false, message: validation.reason };
  }

  const { normalizedVin } = validation;
  const cached = vpicMemoryCache.get(normalizedVin);
  if (cached) {
    return { ok: true, suggestion: cached };
  }

  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return {
      ok: false,
      message:
        'NHTSA vPIC lookup is unavailable while offline. Local taxonomy typeahead remains active.',
    };
  }

  try {
    const url = `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValuesExtended/${encodeURIComponent(normalizedVin)}?format=json`;
    const response = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      return {
        ok: false,
        message: `NHTSA vPIC service returned status ${response.status}.`,
      };
    }

    const payload = (await response.json()) as {
      Results?: Array<Record<string, string | null | undefined>>;
    };
    const firstRow = payload.Results?.[0];
    if (!firstRow) {
      return {
        ok: false,
        message: 'No vehicle specification returned by NHTSA vPIC for this VIN.',
      };
    }

    const suggestion = mapVpicResponseToSpecSuggestion(normalizedVin, firstRow);
    if (!suggestion) {
      return {
        ok: false,
        message: 'NHTSA vPIC could not resolve a make/model for this VIN.',
      };
    }

    vpicMemoryCache.set(normalizedVin, suggestion);
    return { ok: true, suggestion };
  } catch (error) {
    logger.warn('NHTSA vPIC lookup failed:', error);
    return {
      ok: false,
      message: 'Unable to reach NHTSA vPIC right now. Enter specs manually or use local taxonomy.',
    };
  }
}
