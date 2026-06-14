import AxeBuilder from '@axe-core/playwright';
import { expect, type Page } from '@playwright/test';

/** WCAG 2.1 AA tags used for EquipQR accessibility scans. */
export const WCAG21_AA_TAGS = ['wcag2a', 'wcag2aa', 'wcag21aa'] as const;

/** Third-party embeds that axe cannot fully analyze — exclude only these selectors. */
const THIRD_PARTY_EXCLUDES = [
  // Google Maps canvas/iframe — keyboard path uses EquipmentPanel list instead.
  '.gm-style',
  'iframe[src*="google.com/maps"]',
];

export type AxeScanOptions = {
  /** Optional CSS selector to scope the scan (defaults to document). */
  scope?: string;
  /** Additional selectors to exclude beyond third-party defaults. */
  exclude?: string[];
};

/**
 * Runs axe against the current page and fails the test on WCAG 2.1 AA violations.
 */
export async function assertNoAxeViolations(
  page: Page,
  options: AxeScanOptions = {},
): Promise<void> {
  const { scope, exclude = [] } = options;

  let builder = new AxeBuilder({ page }).withTags([...WCAG21_AA_TAGS]);

  for (const selector of [...THIRD_PARTY_EXCLUDES, ...exclude]) {
    builder = builder.exclude(selector);
  }

  if (scope) {
    builder = builder.include(scope);
  }

  const results = await builder.analyze();

  if (results.violations.length > 0) {
    const summary = results.violations
      .map(
        (v) =>
          `[${v.impact}] ${v.id}: ${v.description}\n  ${v.nodes
            .slice(0, 3)
            .map((n) => n.target.join(' > '))
            .join('\n  ')}`,
      )
      .join('\n\n');
    expect(results.violations, `axe WCAG 2.1 AA violations:\n${summary}`).toHaveLength(0);
  }
}
