import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  inferEquipmentFromPartialInput,
  lookupEpaEngineFamily,
  mapVpicResponseToSpecSuggestion,
  mergeManufacturerModelSuggestions,
  normalizeEquipmentToken,
  resolveCanonicalManufacturer,
  validateHighwayVin,
} from '../equipmentTaxonomyInference';
import { decodeHighwayVinViaVpic } from '../../services/equipmentSpecInferenceService';

describe('equipmentTaxonomyInference (#1510)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('normalizeEquipmentToken & resolveCanonicalManufacturer', () => {
    it('normalizes CAT, Cat., and Caterpillar to Caterpillar', () => {
      expect(normalizeEquipmentToken('Cat. 320-GC')).toBe('cat320gc');
      expect(resolveCanonicalManufacturer('cat')).toBe('Caterpillar');
      expect(resolveCanonicalManufacturer('Cat.')).toBe('Caterpillar');
      expect(resolveCanonicalManufacturer('Caterpillar')).toBe('Caterpillar');
      expect(resolveCanonicalManufacturer('JD')).toBe('John Deere');
    });
  });

  describe('inferEquipmentFromPartialInput', () => {
    it('suggests canonical Caterpillar 320 / 320 GC + Earthmoving category from partial fragments', () => {
      const cat320 = inferEquipmentFromPartialInput({
        manufacturerInput: 'cat 320',
        modelInput: '',
      });
      expect(cat320).not.toBeNull();
      expect(cat320?.manufacturer).toBe('Caterpillar');
      expect(cat320?.model).toBe('320');
      expect(cat320?.category).toBe('Earthmoving');
      expect(cat320?.subtype).toBe('Hydraulic Excavator');
      expect(cat320?.source).toBe('taxonomy');

      const cat320gc = inferEquipmentFromPartialInput({
        manufacturerInput: 'Caterpillar',
        modelInput: '320GC',
      });
      expect(cat320gc).not.toBeNull();
      expect(cat320gc?.manufacturer).toBe('Caterpillar');
      expect(cat320gc?.model).toBe('320 GC');
      expect(cat320gc?.category).toBe('Earthmoving');
    });

    it('infers Toyota 8FGU25 forklift when only model fragment 8FGU25 is entered', () => {
      const forklift = inferEquipmentFromPartialInput({
        manufacturerInput: '',
        modelInput: '8FGU25',
      });
      expect(forklift).not.toBeNull();
      expect(forklift?.manufacturer).toBe('Toyota');
      expect(forklift?.model).toBe('8FGU25');
      expect(forklift?.category).toBe('Material Handling');
      expect(forklift?.subtype).toBe('Pneumatic Tire Forklift');
    });

    it('prioritizes org-scoped fleet-as-cache (shop source) over static taxonomy seed', () => {
      const suggestion = inferEquipmentFromPartialInput({
        manufacturerInput: 'cat',
        modelInput: '320',
        fleetCache: [
          {
            manufacturer_norm: 'caterpillar',
            model_norm: '320',
            manufacturer: 'Caterpillar',
            model: '320',
            category: 'Heavy Excavators',
            subtype: 'Long Reach Excavator',
            specs: { hydraulic_oil: 'Cat HYDO Advanced 10' },
            source: 'shop',
            confidence: 1.0,
          },
        ],
      });

      expect(suggestion).not.toBeNull();
      expect(suggestion?.source).toBe('shop');
      expect(suggestion?.category).toBe('Heavy Excavators');
      expect(suggestion?.specs.hydraulic_oil).toBe('Cat HYDO Advanced 10');
    });
  });

  describe('validateHighwayVin & decodeHighwayVinViaVpic', () => {
    it('rejects off-highway serials and invalid VINs without calling vPIC', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch');

      const shortSerial = validateHighwayVin('8FGU25-12345');
      expect(shortSerial.valid).toBe(false);

      const badCheckDigit = validateHighwayVin('1FTFW1EF9EFA00001');
      expect(badCheckDigit.valid).toBe(false);

      const decodeResult = await decodeHighwayVinViaVpic('CAT0320DPABC12345');
      expect(decodeResult.ok).toBe(false);
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('validates a genuine 17-char highway VIN and maps vPIC fields', () => {
      // 11111111111111111 has weight sum 88, 88 % 11 = 0 -> check digit '1' at index 8? Wait:
      // All '1's: transliteration of '1' is 1; sum of weights = 8+7+6+5+4+3+2+10+0+9+8+7+6+5+4+3+2 = 89; 89 % 11 = 1!
      // So '11111111111111111' has check digit '1' at position 9 (index 8)!
      const validVin = validateHighwayVin('11111111111111111');
      expect(validVin).toEqual({
        valid: true,
        normalizedVin: '11111111111111111',
      });

      const mapped = mapVpicResponseToSpecSuggestion('11111111111111111', {
        Make: 'FORD',
        Model: 'F-550',
        ModelYear: '2023',
        GVWR: 'Class 5: 16,001 - 19,500 lb',
        BodyClass: 'Incomplete - Chassis Cab',
        FuelTypePrimary: 'Diesel',
      });

      expect(mapped).not.toBeNull();
      expect(mapped?.source).toBe('vpic');
      expect(mapped?.manufacturer).toBe('Ford');
      expect(mapped?.model).toBe('F-550');
      expect(mapped?.specs.model_year).toBe('2023');
      expect(mapped?.specs.gvwr).toContain('Class 5');
    });
  });

  describe('lookupEpaEngineFamily', () => {
    it('resolves exact 12-char EPA engine family codes and pattern-based displacements', () => {
      const cummins = lookupEpaEngineFamily('PCEXL06.7AAB');
      expect(cummins).not.toBeNull();
      expect(cummins?.source).toBe('epa');
      expect(cummins?.manufacturer).toBe('Cummins');
      expect(cummins?.specs.emissions_tier).toBe('EPA Tier 4 Final');
      expect(cummins?.specs.hp_band).toContain('175-325 HP');

      const patternFallback = lookupEpaEngineFamily('RJDXL06.8101');
      expect(patternFallback).not.toBeNull();
      expect(patternFallback?.source).toBe('epa');
      expect(patternFallback?.manufacturer).toBe('John Deere');
      expect(patternFallback?.specs.engine_displacement_l).toBe('6.8L');

      expect(lookupEpaEngineFamily('SHORT')).toBeNull();
    });
  });

  describe('mergeManufacturerModelSuggestions', () => {
    it('combines shop fleet entries, spec cache, and taxonomy seed without duplicates', () => {
      const merged = mergeManufacturerModelSuggestions(
        [{ manufacturer: 'cat', models: ['320', 'CustomShopUnit'] }],
        [
          {
            manufacturer_norm: 'caterpillar',
            model_norm: '325',
            manufacturer: 'Caterpillar',
            model: '325',
            category: 'Earthmoving',
            subtype: 'Excavator',
            specs: {},
            source: 'shop',
            confidence: 1,
          },
        ],
      );

      const catEntry = merged.find((m) => m.manufacturer === 'Caterpillar');
      expect(catEntry).toBeDefined();
      expect(catEntry?.models).toContain('320');
      expect(catEntry?.models).toContain('320 GC');
      expect(catEntry?.models).toContain('325');
      expect(catEntry?.models).toContain('CustomShopUnit');
    });
  });
});
