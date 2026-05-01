---
name: slow-network-offline-performance
description: Analyzes and improves EquipQR reliability on slow 4G networks (~1–5 Mbps, 100–400ms latency) and intermittent connections across bundle size, data fetching, caching, offline resilience, and perceived performance. Use when optimizing field-technician UX, throttled networks, PWA/offline gaps, Vite bundles, TanStack Query usage, Supabase query efficiency, or perceived loading behavior.
---

# Slow Network & Offline Performance Optimization

## Purpose

Analyze and improve EquipQR's performance for reliability on slow 4G networks
(~1–5 Mbps, 100–400ms latency) and intermittent connections. This skill covers
bundle size, data fetching strategy, caching, offline resilience, and perceived
performance.

---

## MANDATORY WORKFLOW

**You MUST switch to Plan Mode before making any code changes.**

1. Run the full audit (all phases below)
2. Produce a written `PERFORMANCE_PLAN.md` with prioritized findings
3. Get confirmation before implementing ANYTHING
4. Implement changes phase by phase, one at a time
5. Validate each change with the relevant metric before proceeding

---

## Phase 1 — Bundle & Asset Audit

Analyze `vite.config.ts`, `package.json`, `src/`, and build output:

- Run `npx vite build --mode production` and examine the rollup output
- Run `npx size-limit` (`.size-limit.json` is already configured)
- Identify chunks > 50KB uncompressed
- Find any imports that are not lazy-loaded but should be (route-level pages,
  heavy charts, modals, admin-only features)
- Check for duplicate dependencies across chunks
- Identify any synchronous imports of large libraries (e.g., date-fns, lodash,
  recharts)
- Look for tree-shaking failures (barrel `index.ts` files that import everything)
- Check `index.html` for render-blocking scripts or stylesheets

**Output:** List all chunks with sizes, flag anything above 50KB, and identify
every lazy-load opportunity.

---

## Phase 2 — Network Request Audit

Examine all Supabase queries across `src/`:

- Find queries that run without `select()` column filters (fetching all columns)
- Find N+1 query patterns (queries inside loops or triggered by other query results)
- Identify missing `abortController` / query cancellation on component unmount
- Find any polling patterns or excessive `refetchInterval` values
- Identify queries that refetch on every focus or window visibility change
  unnecessarily
- Check if React Query / TanStack Query is used; if so, review `staleTime`,
  `cacheTime`, and `gcTime` settings for each query key
- Check if Supabase Realtime subscriptions are opened on pages that don't need
  live data
- Identify any uncompressed image uploads or missing `width`/`height` on `<img>`
  tags

**Output:** List every Supabase query with its endpoint, select columns, and
caching config. Flag inefficient patterns.

---

## Phase 3 — Offline & Resilience Audit

- Check `public/` and Vite config for a Service Worker (`sw.ts`, `vite-plugin-pwa`)
- If no PWA/SW exists, flag as critical gap for field use on slow 4G
- Review how the app handles `navigator.onLine === false` — does it show
  meaningful UI or just error?
- Check if any critical user flows (work order creation, equipment scan) can
  complete without a network round-trip
- Review Supabase client instantiation for connection timeout settings
- Check for optimistic UI patterns on mutations — if absent, flag the highest-
  impact mutations (work order save, note creation, status updates)
- Look for retry logic on failed fetches (exponential backoff)
- Check if React Query's `retry` and `retryDelay` are configured

**Output:** List all offline gaps. Rate each as Critical / High / Medium.

---

## Phase 4 — Perceived Performance Audit

- Check every route-level page for loading states — are skeletons used or just
  spinners?
- Look for any LCP (Largest Contentful Paint) blockers: unoptimized hero images,
  late-loading fonts, missing preload hints in `index.html`
- Check Tailwind config for PurgeCSS / content paths being correct (unused CSS
  bloat)
- Check if any pages do data fetching AFTER mount instead of in parallel with
  rendering (waterfall patterns)
- Identify any `useEffect` chains that create sequential data fetching
- Review navigation — does switching routes trigger full data re-fetches that
  could use cached data?

**Output:** List perceived performance issues with estimated user-visible impact.

---

## Phase 5 — Plan Document

After all 4 audit phases, create `PERFORMANCE_PLAN.md` in the project root with:

```markdown
# EquipQR Performance Plan — Slow 4G Optimization

## Executive Summary
[2-3 sentence summary of the biggest wins available]

## Priority Matrix
| Priority | Change | Estimated Impact | Effort | Phase |
|----------|--------|-----------------|--------|-------|
| P0 | ... | ... | ... | ... |

## P0 — Critical (Implement First)
[Changes that unblock field use on slow 4G]

## P1 — High Impact
[Changes with >20% improvement potential]

## P2 — Medium Impact
[Incremental improvements]

## P3 — Nice to Have
[Low effort, low risk tweaks]

## Metrics Baseline
[Current bundle sizes, Lighthouse scores if available, query counts]

## Success Criteria
- Initial page load < 3s on simulated Slow 4G (Chrome DevTools throttle)
- Time to interactive < 5s
- Core user flow (scan QR → view work orders) works with 0 network requests
  after first load
- All mutations show optimistic UI within 100ms
```

**Do NOT write any code until this plan is reviewed and approved.**

---

## Implementation Rules (Post-Approval Only)

- One P-level at a time — complete all P0 changes before starting P1
- Each change must include its own test or measurable validation step
- Bundle changes: re-run `size-limit` after each change and record delta
- Query changes: add a comment with the query's estimated payload size
- Never remove a feature to hit a size target — only defer loading
- All lazy-loaded components must have a `<Suspense fallback={...}>` with a
  skeleton, not null
- Service Worker scope must cover the `/` origin and cache the app shell,
  critical assets, and last-viewed equipment list
- Optimistic updates must be rolled back cleanly on error with a toast notification

---

## Key Files to Always Review

- `vite.config.ts` — build chunking and plugin config
- `src/lib/supabase.ts` or equivalent — client config
- `src/hooks/` — all custom data hooks
- `src/pages/` or `src/routes/` — route-level components (lazy load candidates)
- `.size-limit.json` — current size budget
- `netlify.toml` / `vercel.json` — CDN caching headers
- `public/sw.js` or `src/sw.ts` — service worker (if present)
- `index.html` — preload hints, font loading strategy

---

## Slow 4G Simulation

When validating changes, use Chrome DevTools Network tab with the preset:
**"Slow 4G"** (1.5 Mbps down, 750 Kbps up, 150ms latency)

Or apply this custom throttle profile:
- Download: 1,500 Kbps
- Upload: 750 Kbps  
- Latency: 200ms

Test the following flows under throttle:
1. Cold load (empty cache) → dashboard
2. QR code scan → equipment detail page
3. Create/update a work order
4. Navigate between 3 pages using back button (should use cache)
