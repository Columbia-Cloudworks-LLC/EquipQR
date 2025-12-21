import { describe, it, expect, vi } from 'vitest';
import * as svc from '@/features/part-picker/services/partsService';

vi.mock('@/integrations/supabase/client', () => {
  return {
    supabase: {
      functions: {
        invoke: vi.fn(async (name: string) => {
          if (name === 'parts-search') {
            return { data: { results: [{ id: '1', canonical_mpn: '2349005', title: 'O2 Sensor', brand: 'Denso', category: 'Emission Control', distributor_count: 2, has_distributors: true }] } };
          }
          if (name === 'part-detail') {
            return { data: { part: { id: '1', canonical_mpn: '2349005', title: 'O2 Sensor', brand: 'Denso', category: 'Emission Control', description: null, attributes: null, synonyms: [] }, distributors: [{ name: 'ACME', phone: '555', website: 'https://x', email: 'a@b' }] } };
          }
          return { data: null };
        })
      }
    }
  };
});

describe('partsService', () => {
  it('searchParts returns results list', async () => {
    const res = await svc.searchParts({ q: '234-9005' });
    expect(res.results.length).toBe(1);
    expect(res.results[0].canonical_mpn).toBe('2349005');
  });

  it('getPartDetail returns detail', async () => {
    const res = await svc.getPartDetail('1');
    expect(res.part.id).toBe('1');
    expect(res.distributors.length).toBe(1);
  });
});
