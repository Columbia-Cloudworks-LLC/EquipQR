import { describe, it, expect } from 'vitest';
import {
  MARKETING_ROUTES,
  EXPECTED_MARKETING_ROUTE_COUNT,
  resolveCanonicalPath,
  resolveFullDocumentTitle,
} from '../marketingRoutes';

describe('MARKETING_ROUTES', () => {
  it('lists exactly 16 indexable marketing URLs', () => {
    expect(MARKETING_ROUTES.length).toBe(EXPECTED_MARKETING_ROUTE_COUNT);
  });

  it('has unique paths and at least two body paragraphs per route', () => {
    const paths = MARKETING_ROUTES.map((r) => r.path);
    expect(new Set(paths).size).toBe(paths.length);

    for (const route of MARKETING_ROUTES) {
      expect(route.bodyParagraphs.length).toBeGreaterThanOrEqual(2);
      expect(route.heading.trim().length).toBeGreaterThan(0);
      expect(route.description.trim().length).toBeGreaterThan(0);
    }
  });

  it('canonicalizes /landing to /', () => {
    const landing = MARKETING_ROUTES.find((r) => r.path === '/landing');
    expect(landing).toBeDefined();
    expect(resolveCanonicalPath(landing!)).toBe('/');
  });

  it('uses the canonical home title for /landing without adding a duplicate suffix', () => {
    const home = MARKETING_ROUTES.find((r) => r.path === '/');
    const landing = MARKETING_ROUTES.find((r) => r.path === '/landing');

    expect(home).toBeDefined();
    expect(landing).toBeDefined();
    expect(resolveFullDocumentTitle(landing!)).toBe(resolveFullDocumentTitle(home!));
    expect(resolveFullDocumentTitle(landing!)).not.toMatch(/\| EquipQR \| EquipQR$/);
  });
});
