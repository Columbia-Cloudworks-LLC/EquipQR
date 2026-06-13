# PR visual evidence (Playwright)

Every product PR must include **screenshots and at least one GIF** demonstrating the change on the **local dev stack** (`http://localhost:8080`). Agents capture artifacts here, upload them to Supabase Storage, and embed public URLs in the PR body and/or a dedicated PR comment.

## When to add a spec

| Change type | Spec requirement |
|-------------|------------------|
| UI route, form, dialog, dashboard flow | **Required:** add `e2e/pr-evidence/<feature>.spec.ts` |
| Edge-only / no UI | Use RPC/log proof in PR body; no Playwright spec |
| Workflow-only (`.cursor/**`, `AGENTS.md`) | No PR evidence spec |

If no feature spec exists yet, `smoke-dashboard.spec.ts` is the fallback — **do not stop at the fallback** when the PR touches user-visible UI.

## Authoring a feature spec

1. Copy the pattern from `smoke-dashboard.spec.ts`.
2. Use `evidenceScreenshot(page, '01-step-label')` at each meaningful state (before, during, after).
3. Add short `evidencePause` calls so GIF playback is readable.
4. Prefer Alex Apex (`gotoDashboard` fixture) unless RBAC requires another persona.
5. Keep specs deterministic — use seeded data from `supabase/seeds/`.
6. **Google Workspace flows** (`@real-auth`): quick-login personas cannot connect Google Workspace. Tag the spec `@real-auth`, capture Google sign-in with `npm run e2e:google-auth:capture`, then run capture with `E2E_REAL_AUTH_STORAGE_STATE` set. See `docs/ops/playwright-real-auth-integrations.md`.

Example skeleton:

```typescript
import { test, expect } from '../user/fixtures/equipqr-test';
import { evidenceScreenshot, evidencePause } from './shared/evidence-helpers';

test.describe('my feature @pr-evidence', () => {
  test('demonstrates the change', async ({ gotoDashboard, page }) => {
    await gotoDashboard('/dashboard/my-route');
    await evidenceScreenshot(page, '01-before');
    // ... interact ...
    await evidencePause(page, 600);
    await evidenceScreenshot(page, '02-after');
    await expect(page.getByText(/expected outcome/i)).toBeVisible();
  });
});
```

## Capture and publish

```powershell
# Capture (stack must be up — dev-start.bat or run-user-regression preflight)
.\scripts\pr-evidence\Invoke-PrEvidence.ps1 `
  -Flow "my-feature-slug" `
  -Spec "e2e/pr-evidence/my-feature.spec.ts"

# After gh pr create, upload and post the evidence comment
.\scripts\pr-evidence\Invoke-PrEvidence.ps1 `
  -Flow "my-feature-slug" `
  -Spec "e2e/pr-evidence/my-feature.spec.ts" `
  -PrNumber 1234 `
  -Publish
```

Artifacts land under `tmp/pr-evidence/{flow}/` (gitignored). Published URLs use the preview Supabase `landing-page-images` bucket under `pr-evidence/{branch}/`.

See `scripts/pr-evidence/README.md` for full operator docs.
