export type MarketingRoute = {
  path: string;
  priority: string;
  changefreq: string;
  /** Same `title` prop as `PageSEO` for this path (see `src/components/seo/PageSEO.tsx`). */
  title: string;
  description: string;
  /** Primary visible heading in prerendered HTML. */
  heading: string;
  /** Short label for crawlable nav links (defaults to `heading` in generator). */
  navLabel?: string;
  /** Canonical URL path for `<link rel="canonical">` (`/` for `/landing`). */
  canonicalPath?: string;
  /** Two or more paragraphs for non-JS crawlers. */
  bodyParagraphs: readonly [string, string, ...string[]];
};
