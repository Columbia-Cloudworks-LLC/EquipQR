import { describe, expect, it } from 'vitest';
import { EMPTY_LANDSCAPE_FILTERS, filterLandscapeCases } from './filterLandscapeCases';
import type { LandscapeCase, LandscapeFilters } from './types';

const cases: LandscapeCase[] = [
  {
    id: 'cloud-hub',
    title: 'Cloud hub shutdown',
    vendor: 'Insteon',
    lenses: ['software'],
    sector: 'consumer',
    mechanisms: ['cloud-tether'],
    period: '2022',
    practice: 'The vendor cloud went offline.',
    harm: 'Installed hubs stopped responding.',
    sourceLabel: 'test',
  },
  {
    id: 'tractor-tools',
    title: 'Dealer-only diagnostics',
    vendor: 'Deere',
    lenses: ['physical', 'software'],
    sector: 'agriculture-fleet',
    mechanisms: ['diagnostic-lockout'],
    period: '2010s–',
    practice: 'Repair tools stayed behind dealer software.',
    harm: 'Independent shops could not complete work.',
    sourceLabel: 'test',
  },
  {
    id: 'parts-pair',
    title: 'Serialized parts',
    vendor: 'Apple',
    lenses: ['hardware'],
    sector: 'consumer',
    mechanisms: ['parts-pairing'],
    period: '2020s',
    practice: 'Replacement parts must cryptographically pair.',
    harm: 'Independent repair is degraded.',
    sourceLabel: 'test',
  },
];

function filters(partial: Partial<LandscapeFilters>): LandscapeFilters {
  return { ...EMPTY_LANDSCAPE_FILTERS, ...partial };
}

describe('filterLandscapeCases', () => {
  it('returns every case when filters are empty', () => {
    expect(filterLandscapeCases(cases, EMPTY_LANDSCAPE_FILTERS)).toHaveLength(3);
  });

  it('keeps cases that include the selected lens among several lenses', () => {
    const result = filterLandscapeCases(cases, filters({ lens: 'software' }));
    expect(result.map((item) => item.id)).toEqual(['cloud-hub', 'tractor-tools']);
  });

  it('intersects lens, sector, and mechanism', () => {
    const result = filterLandscapeCases(
      cases,
      filters({
        lens: 'hardware',
        sector: 'consumer',
        mechanism: 'parts-pairing',
      }),
    );
    expect(result.map((item) => item.id)).toEqual(['parts-pair']);
  });

  it('matches query against title, vendor, and body copy', () => {
    expect(filterLandscapeCases(cases, filters({ query: 'insteon' })).map((item) => item.id)).toEqual(
      ['cloud-hub'],
    );
    expect(filterLandscapeCases(cases, filters({ query: 'dealer' })).map((item) => item.id)).toEqual(
      ['tractor-tools'],
    );
  });

  it('returns no rows when the intersection is empty', () => {
    expect(
      filterLandscapeCases(cases, filters({ sector: 'enterprise', mechanism: 'cloud-tether' })),
    ).toEqual([]);
  });
});
