# Deployment Guide

This guide covers all aspects of deploying EquipQR™, including build processes, hosting platforms, runner management, and versioning.

## Deployment Overview

EquipQR™ is designed as a modern single-page application (SPA) that can be deployed to various hosting platforms with minimal configuration.

### Public documentation site (`equipqr.info`)

Developer and operator documentation is published from this repository’s [`docs/`](https://github.com/Columbia-Cloudworks-LLC/EquipQR/tree/main/docs) directory as a **standalone VitePress** static site. It is deployed as a **separate Vercel project** with **Root Directory** set to `docs` (build: `npm run docs:build`, output: `.vitepress/dist`). Production hostname: **`https://equipqr.info`**. The product app remains on **`https://equipqr.app`**.

**Operational wiring (Columbia Cloudworks Vercel team):**

| Item | Value |
|------|--------|
| Docs project name | `equipqr-docs` |
| Docs project ID | `prj_6QicTVywixyyAYc7sxCRDLnqwbM9` |
| Production branch | `main` (same branch gate as `equipqr.app`) |
| Domains on docs project | `equipqr.info` (apex), `www.equipqr.info` → apex redirect |
| Preview deploys | Disabled — [`docs/vercel.json`](../vercel.json) `ignoreCommand` skips non-`main` builds |

Keep **`equipqr.info` off the SPA project (`equipqr`)** — only the docs project should attach that hostname.

**Stranded PWA service worker:** Visitors who loaded `equipqr.info` while it still served the SPA may retain the app's Workbox worker at scope `/`. Normal reloads then show the precached app shell under the docs URL; hard reload bypasses the worker. The docs project ships [`docs/public/sw.js`](../public/sw.js) as a kill-switch: on the next worker update check it clears all Cache Storage buckets, reloads open tabs, and unregisters. `docs/vercel.json` sets `Cache-Control: no-cache` on `/sw.js` so browsers pick up the script promptly. This fix deploys with `main` only (same branch gate as the docs site).

**Build note:** Vercel installs dependencies from `docs/package.json` only. Because the monorepo root still has [`postcss.config.js`](../../postcss.config.js), PostCSS can walk up and load the root config unless a scoped file exists. The docs project ships [`docs/postcss.config.js`](../postcss.config.js) (same plugin list as root) and pins `@tailwindcss/postcss`, `tailwindcss`, and `postcss` under [`docs/package.json`](../package.json). Tailwind is also wired in [`docs/.vitepress/config.ts`](../.vitepress/config.ts) for local dev.

**Design tokens (app ↔ docs):** The product Mission Control palette lives in [`src/index.css`](../../src/index.css). The VitePress theme under [`docs/.vitepress/theme/`](../.vitepress/theme/) mirrors those HSL values into `equipqr-tokens.css` and maps them to VitePress `--vp-*` variables in `custom.css` (default appearance is dark). When you change primary, background, border, or semantic status colors in the app, update the matching `--eqr-*` values in `equipqr-tokens.css` in the same change (or immediately after) so equipqr.info stays visually continuous with equipqr.app. There is not yet a shared compiled token package — the mirror is intentional and documented.

**Local footer testing:** Run `bash dev/linux/dev.sh start` to start the product app and docs site together. In local Vite dev mode, the app footer’s Documentation link defaults to `http://localhost:5174`; production builds default to `https://equipqr.info`. Set `VITE_DOCUMENTATION_URL` when you need to test a different docs preview URL, such as `http://localhost:4173` after running `npm run docs:build` and then `npm run docs:preview`.

**`docs:build` CSP:** the build runs `externalize-docs-inline-scripts.mjs`
so VitePress inline bootstrap scripts become content-addressed
`/assets/inline.*.js` files. Committed `docs/vercel.json` keeps static
`script-src 'self'` (Vercel serves committed headers, so post-build
sha256 hashes from older flows drifted and broke hydration).

**docs-media publishing:** upload curated captures via
`npx tsx dev/upload-screenshot.ts <local> <storage-path> docs-media`
with env from `Set-PrEvidenceUploadEnvironment`. Docs embed images as
`https://supabase.equipqr.app/storage/v1/object/public/docs-media/...`
and videos as bare URLs in angle brackets. Public marketing media uses
Supabase `landing-page-images` / `landing-page-videos` via
`landingImage()` / `landingVideo()`. App image buckets stay private with
signed URLs except organization logos.

**App PWA:** the service worker is disabled on Vite dev
(`localhost:8080`). SW / offline-shell verification requires
`npm run build` + `vite preview`. Stale chunk 404s recover through
chunk-load reload handling.

**Public legal:** `/right-to-repair` (Legal footer; stance, not a
contract) — keep with Terms / Privacy / Security under `src/pages`.
App links to Help Center resolve through `documentationUrl.ts`.

**Related domains:** During domain migration, **`equipqr.support`** / **`www.equipqr.support`** on the SPA project may temporarily redirect to **`equipqr.app`** instead of **`equipqr.info`** because Vercel only allows same-project redirect targets; revisit in the dashboard if those URLs should land on the public docs site again.

## Build Process

### Marketing photography

See [marketing photography](./marketing-photography.md) for stock-photo sources,
licenses, non-AI provenance, optimized assets, and page placement. The homepage
animation remains the primary product demonstration.

### Development Build
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Access application at http://localhost:8080
```

### Production Build
```bash
# Create optimized production build
npm run build

# Preview production build locally
npm run preview
```

### Build Optimization
The production build includes:
- **Code Splitting**: Automatic code splitting for optimal loading
- **Tree Shaking**: Remove unused code from final bundle
- **Asset Optimization**: Compress images, CSS, and JavaScript
- **Caching**: Long-term caching headers for static assets

## Environment Configuration

### Environment Variables
Create environment files for different deployment stages:

#### `.env.local` (Development)
```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Optional Development Settings
VITE_APP_TITLE=EquipQR™ Development
VITE_ENABLE_DEVTOOLS=true
VITE_LOG_LEVEL=debug
```

#### `.env.production` (Production)
```env
# Supabase Configuration (Required)
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Optional Production Settings
VITE_APP_TITLE=EquipQR
VITE_ENABLE_DEVTOOLS=false
VITE_LOG_LEVEL=error
VITE_SENTRY_DSN=your-sentry-dsn

# Optional Service Integrations
VITE_GOOGLE_MAPS_API_KEY=your_maps_key
```

### Configuration Management
```typescript
// src/lib/config.ts
export const config = {
  app: {
    title: import.meta.env.VITE_APP_TITLE || 'EquipQR™',
    version: import.meta.env.VITE_APP_VERSION || '1.0.0',
  },
  supabase: {
    url: import.meta.env.VITE_SUPABASE_URL,
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
  },
  services: {
    stripe: {
      publishableKey: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY,
    },
    maps: {
      apiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    },
  },
  features: {
    enableDevTools: import.meta.env.VITE_ENABLE_DEVTOOLS === 'true',
    enableAnalytics: import.meta.env.VITE_ENABLE_ANALYTICS === 'true',
  },
};
```

### Cloud Agent Preview Access Verification

Cloud Agents can verify browser access without relying on local Supabase or
Docker. The check starts local Vite, maps the Cloud Agent `SUPABASE_URL` and
`SUPABASE_ANON_KEY` secrets into the client-visible `VITE_*` variables in the
child process only, registers a generated test account, clears the browser
session, logs back in with that generated account, and confirms both flows reach
`/dashboard`.

Required Cloud Agent environment secrets:

| Variable | Purpose |
|---|---|
| `SUPABASE_URL` | Preview Supabase project URL. Host-only values are normalized to HTTPS by the script. |
| `SUPABASE_ANON_KEY` | Preview Supabase anonymous/public key. |

The script also reports whether `PREVIEW_LOGIN_EMAIL` and
`PREVIEW_LOGIN_PASSWORD` are present, but the verification uses a generated test
account so it does not depend on those credentials being valid.

**Prerequisite:** Playwright must have downloaded the Chromium browser binary (Cloud Agent runners without it exit with a missing-binary error). After `npm ci`, install Chromium once:

```bash
npx playwright install chromium
```

Run:

```bash
npm run verify:preview-access
```

The script intentionally prints only status markers such as `[set]`, `[yes]`,
`[created]`, and HTTP status codes. It must not print email addresses,
passwords, Supabase keys, or session tokens.

## Hosting Platforms

EquipQR™ is hosted on Vercel. The `main` branch promotes to `equipqr.app` after
**Production Release Readiness** runs **`vercel promote`**. **`preview.equipqr.app`**
is the stable pre-production hostname bound to git branch **`preview`** (integration
train) — Vercel Preview deploys on merges/pushes to that branch. SSL, CDN, and custom
domain routing are managed in the Vercel dashboard.

See **`docs/ops/git-and-deploy.md`** for the authoritative git/deploy loop.

### Vercel Deployment
Use the current [Linux workflow commands](https://github.com/Columbia-Cloudworks-LLC/EquipQR/blob/preview/docs/ops/linux-workflows.md) for this operation.
### Netlify Deployment

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Build and deploy
npm run build
netlify deploy --prod --dir=dist
```

#### `netlify.toml` Configuration
```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/app-shell.html"
  status = 200

[[headers]]
  for = "/assets/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"
```

> **Netlify vs Vercel:** Netlify has no `cleanUrls` equivalent, so the catch-all redirect must target the literal build artifact `/app-shell.html`. Vercel uses `cleanUrls: true` and rewrites extensionless paths to `/app-shell`. Marketing routes are prerendered to per-route `index.html` files on both hosts; only authenticated/app routes fall through to the empty SPA shell.

### AWS S3 + CloudFront
```bash
# Build application
npm run build

# Sync to S3 bucket
aws s3 sync dist/ s3://your-bucket-name --delete

# Invalidate CloudFront cache
aws cloudfront create-invalidation --distribution-id YOUR_DISTRIBUTION_ID --paths "/*"
```

## Linux CI runners

Workflows run on GitHub-hosted Linux by default. To use a self-hosted runner,
register an Ubuntu 24.04 runner with the `self-hosted` and `Linux` labels and install
the prerequisites in [Linux development](linux-development.md). Do not register a
Windows runner for these jobs. Run untrusted PR code only on isolated disposable runners.

```bash
bash dev/ops/runner-type.sh hosted
# An explicitly authorized switch to an already provisioned Linux runner:
bash dev/ops/runner-type.sh self-hosted
```

Use the runner's systemd service for lifecycle and `journalctl` for diagnostics.
Keep its workspace and npm cache on a Linux filesystem, monitor disk capacity,
and let Actions setup-node select the repository's Node version.

## Versioning System

`package.json` is the source of truth for the shipped app version. Feature PRs into `preview` do not bump it. `/release` chooses one SemVer, empties `[Unreleased]`, and pushes the bump onto `preview` before the promote PR to `main`. Changelog bullets follow `.cursor/rules/changelog.mdc`. See [`git-and-deploy.md`](./git-and-deploy.md).

### How It Works

#### Version Format
- **Format**: `MAJOR.MINOR.PATCH` (e.g., `1.12.3`)
- **Tag Format**: `vMAJOR.MINOR.PATCH` (e.g., `v1.12.3`)
- **Source of Truth**: the `version` field in `package.json` after a promote

### Automatic Version Tagging

The tagging system is automated after promote:

1. **`/release`** bumps `package.json` on the `preview` tip and opens `preview` → `main`.
2. **`version-tag.yml`** runs on push to `main` when `package.json` changes. It reads the version, creates annotated tag `v{version}` if missing, and skips if the tag already exists.
3. **Build integration**:
   - CI workflows read the version from `package.json`
   - Exposes as `VITE_APP_VERSION` during build
   - The app displays the version in the footer

### Semantic Versioning Guidelines

- **Major** (X.0.0): Only when the user requests a breaking customer-visible change
- **Minor** (X.Y.0): New customer-visible capability or meaningful workflow expansion
- **Patch** (X.Y.Z): Fixes, security without product-shape change, batched dependencies, small UX corrections
- Do not cut a patch for a single Dependabot bump

### Workflow

#### To Release a New Version

Run **`/release`** (or the promote path in [`git-and-deploy.md`](./git-and-deploy.md)). Do not bump `package.json` on a feature PR into `preview`.

After the promote lands on `main`, `version-tag.yml` creates `vX.Y.Z` if that tag does not already exist.

### Local Development

For local development, the version will show as `dev` if no `VITE_APP_VERSION` is set. The build process reads from `package.json` as a fallback.

### Manual Tag Management

#### Rollback a Version

If you need to undo a version:

```bash
# Delete tag locally and remotely
git tag -d vX.Y.Z
git push origin --delete vX.Y.Z

# Revert package.json version change
git revert <commit-sha>
git push origin main
```

#### Emergency Manual Tag Creation

If the auto-tagging workflow fails, you can create a tag manually:

```bash
# Ensure package.json has the correct version
# Then create and push tag
git tag -a vX.Y.Z -m "Release vX.Y.Z"
git push origin vX.Y.Z
```

### Troubleshooting

#### Tag not created after version change

- Check if workflow ran: Go to Actions tab and look for "Auto Version Tag" workflow
- Verify `package.json` was actually changed in the commit
- Check workflow logs for errors
- Ensure workflow has `contents: write` permission

#### Version not showing in deployed app

- Verify `package.json` has the correct version
- Check CI logs: Ensure version was read from `package.json` during build
- Verify `VITE_APP_VERSION` was set during build

#### Version in footer shows "dev"

- Expected in local development without `VITE_APP_VERSION` env var
- In production: Check that build read version from `package.json`

#### Duplicate tag error

- The workflow checks if a tag exists before creating it
- If you see this error, the tag already exists for that version
- Either use a different version number or delete the existing tag first

### Version Display

The version is displayed in the footer of all pages in the format: `© 2024 EquipQR™ v1.2.3 by COLUMBIA CLOUDWORKS LLC`

### Files Involved

- `package.json` - **Source of truth** for version number
- `.github/workflows/version-tag.yml` - Auto-tagging workflow (creates tags when version changes)
- `.github/workflows/ci.yml` - Reads version from `package.json` during build
- `.github/workflows/deploy.yml` - Reads version from `package.json` for deployment notifications
- `src/components/layout/LegalFooter.tsx` - Version display in UI
- `src/lib/version.ts` - Version constant with fallback chain (`VITE_APP_VERSION` → `package.json` → `"dev"`)
- `vite.config.ts` - Reads from `package.json` as fallback for `__APP_VERSION__` constant

## Performance Optimization

### Bundle Analysis
```bash
# Analyze bundle size
npm run build -- --analyze

# Or use bundle analyzer
npm install -g webpack-bundle-analyzer
npx webpack-bundle-analyzer dist/assets
```

### Performance Monitoring
```typescript
// src/lib/performance.ts
export const trackPerformance = () => {
  // Core Web Vitals
  import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
    getCLS(console.log);
    getFID(console.log);
    getFCP(console.log);
    getLCP(console.log);
    getTTFB(console.log);
  });
};

// Initialize in main.tsx
if (import.meta.env.PROD) {
  trackPerformance();
}
```

### Caching Strategy
```typescript
// Service Worker for caching (optional)
// src/sw.ts
const CACHE_NAME = 'equipqr-v1';
const urlsToCache = [
  '/',
  '/static/css/main.css',
  '/static/js/main.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});
```

## Security Configuration

### Content Security Policy
```html
<!-- Use the exact Content-Security-Policy value from `vercel.json` -->
<meta http-equiv="Content-Security-Policy" content="(see vercel.json -> headers -> Content-Security-Policy -> value)">
```

### HTTPS Configuration
Ensure all deployments use HTTPS:
- **Development**: Use `http://localhost:8080` for local development
- **Production**: Configure SSL certificates on hosting platform
- **API Calls**: Ensure all API endpoints use HTTPS

## Database Integration

### Supabase Integration (Recommended)
EquipQR™ is designed to work with Supabase for backend functionality:

1. **Connect Supabase**: Configure project credentials via Vercel environment variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`)
2. **Database Setup**: Create tables for equipment, work orders, teams
3. **Authentication**: Configure Supabase Auth for user management
4. **Real-time Updates**: Enable real-time subscriptions for live data

### Supabase Branch Configuration

EquipQR uses Supabase branching for **ephemeral PR validation** and, today, a
single production project for cloud runtime:

- **Production:** `ymxkzronkhwxzcdcbnwq` — API `https://supabase.equipqr.app`
- **Current live preview app:** still uses the production project above
- **Approved target preview backend:** a new persistent dataless branch for
  `preview.equipqr.app` (not yet cut over; see
  `docs/ops/preview-persistent-branch.md`)
- **Ephemeral PR branches:** Auto-created when `supabase/**` changes on a PR
- **Retired persistent preview branch:** `olsdirkvvfegvclbpgrg` — decommission after #1033 cutover

`preview.equipqr.app` (Vercel Preview) currently uses
**`VITE_SUPABASE_URL=https://supabase.equipqr.app`** from
`app-env-preview-public`, not the retired `olsdirk` project URL. The approved
replacement is the persistent preview branch above, once its cutover checklist
is implemented.

See `docs/ops/preview-persistent-branch.md`,
`docs/ops/preview-architecture-migration.md`, and
`docs/ops/supabase-branch-secrets.md`.

### Supabase Configuration
EquipQR™ uses Supabase for all backend functionality. Ensure proper configuration:

```typescript
// src/integrations/supabase/client.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing required Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});
```

#### Database Migrations

> **⚠️ IMPORTANT: Local-First Development Workflow**
> All database migrations must be developed and tested locally before deploying to production.

**Standard workflow:**

1. **Develop and test locally** (REQUIRED):
   ```bash
   # Create migration (agent-safe wrapper)
   npm run db:migration:new -- your_migration_name
   
   # Test locally with complete database reset
   npx supabase db reset
   npx supabase db diff
   ```

2. **Deploy to production** (only after local testing succeeds):
   ```bash
   # Deploy to production
   npx supabase db push --linked
   ```

**Local development commands:**
```bash
# Apply migrations to local database
npx supabase db push

# Reset local database and apply all migrations (primary testing method)
npx supabase db reset
```

> **Note**: Supabase CLI is included as a dev dependency. Always use `npx supabase` commands. Do NOT install globally. See [Local Supabase Development Guide](./local-supabase-development.md) for detailed setup instructions.

## Monitoring and Logging

### Error Tracking
```typescript
// src/lib/error-tracking.ts
interface ErrorEvent {
  message: string;
  stack?: string;
  url: string;
  timestamp: Date;
  userAgent: string;
}

export const trackError = (error: Error, context?: Record<string, any>) => {
  const errorEvent: ErrorEvent = {
    message: error.message,
    stack: error.stack,
    url: window.location.href,
    timestamp: new Date(),
    userAgent: navigator.userAgent,
  };
  
  // Send to error tracking service
  console.error('Application Error:', errorEvent, context);
};
```

### Analytics Integration
```typescript
// src/lib/analytics.ts
export const trackEvent = (eventName: string, properties?: Record<string, any>) => {
  if (config.features.enableAnalytics) {
    // Google Analytics 4
    gtag('event', eventName, properties);
    
    // Or custom analytics
    fetch('/api/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: eventName, properties, timestamp: Date.now() }),
    });
  }
};
```

## Maintenance and Updates

### Automated Deployments
```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v2
    - name: Setup Node.js
      uses: actions/setup-node@v2
      with:
        node-version: '18'
    - name: Install dependencies
      run: npm ci
    - name: Run tests
      run: npm test
    - name: Build application
      run: npm run build
    - name: Deploy to hosting
      run: npm run deploy
```

### Health Checks
```typescript
// src/lib/health-check.ts
export const performHealthCheck = async () => {
  const checks = [
    { name: 'API Connection', check: () => fetch('/api/health') },
    { name: 'Database', check: () => fetch('/api/db-health') },
    { name: 'Authentication', check: () => fetch('/api/auth/status') },
  ];
  
  const results = await Promise.allSettled(
    checks.map(async ({ name, check }) => {
      try {
        const response = await check();
        return { name, status: response.ok ? 'healthy' : 'unhealthy' };
      } catch (error) {
        return { name, status: 'error', error: error.message };
      }
    })
  );
  
  return results;
};
```

## Supabase Auth Connection Allocation

The Auth server's DB connection strategy should use **percentage-based allocation**
rather than an absolute connection count. This allows the connection pool to scale
automatically when the Supabase instance is resized.

| Setting | Value | Where |
|---|---|---|
| Auth DB Connection Strategy | Percentage-based | Supabase Dashboard > Project Settings > Auth |

**Changed April 2026**: switched from absolute `10` connections to percentage-based.
The Supabase performance advisor flags absolute allocation because resizing the
instance without updating the number manually leaves Auth underprovisioned. With
percentage-based allocation the pool scales proportionally.

This deployment guide provides comprehensive instructions for deploying EquipQR™ to various platforms while maintaining optimal performance, security, and reliability.
