# PR visual evidence (Playwright)

Every product PR must include **screenshots and a short animated demo** of the change on the **local dev stack** (`http://localhost:8080`). Agents capture artifacts here, review them, then `publish` them with only `git`/`gh` auth: files go to the orphan `pr-evidence` branch and one PR comment embeds them inline. PRs with no UI change state `N/A – no UI change` in the template instead.

## When to add a spec

| Change type | Spec requirement |
|-------------|------------------|
| UI route, form, dialog, dashboard flow | **Required:** add `e2e/pr-evidence/<feature>.spec.ts` |
| Edge-only / no UI | Use RPC/log proof in PR body; no Playwright spec |
| Workflow-only (`.agents/**`, `AGENTS.md`) | No PR evidence spec |

If no feature spec exists yet, `smoke-dashboard.spec.ts` is the fallback — **do not stop at the fallback** when the PR touches user-visible UI.

## Authoring a feature spec

1. Copy the pattern from `smoke-dashboard.spec.ts`.
2. Use `evidenceScreenshot(page, '01-step-label')` at each meaningful state (before, during, after). Pass `{ target: locator }` when a specific control must be fully framed in the PNG.
3. Add short `evidencePause` calls so demo video playback is readable.
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
    const saveButton = page.getByRole('button', { name: /save/i });
    await evidenceScreenshot(page, '01-before', { target: saveButton });
    // ... interact ...
    await evidencePause(page, 600);
    await evidenceScreenshot(page, '02-after', { target: saveButton });
    await expect(page.getByText(/expected outcome/i)).toBeVisible();
  });
});
```

## Frame quality (capture-time)

`evidenceScreenshot()` always asserts **no horizontal viewport overflow**. Pass `{ target: locator }` to scroll the control into frame and assert it is **fully visible** (not clipped by header, FAB, or sheet chrome) before the PNG is written. Helpers live in `shared/evidence-frame-helpers.ts`.

## Visual review (post-capture, mandatory before publish)

Capture writes `tmp/pr-evidence/{flow}/visual-review-checklist.md`. The agent must **open each PNG** (Read tool or local viewer) and the video, and confirm:

- Target control/state is fully in frame with comfortable padding
- No horizontal scroll traps; mobile stacking is intentional
- Primary actions are reachable (not hidden behind fixed chrome)
- Nothing sensitive is visible (captures are published to a public branch)

Then record approval with `bash dev/linux/pr-evidence.sh review --flow <flow> --notes "<what you verified>"`.

`publish` is blocked until `visual-review.json` has `approved: true` for the current manifest hash. Re-capture clears stale approval.

## Capture, review, publish

```bash
# Capture (starts the local stack unless --skip-stack-start)
bash dev/linux/pr-evidence.sh capture --flow my-feature-slug --spec e2e/pr-evidence/my-feature.spec.ts

# Mandatory visual review: open each PNG in tmp/pr-evidence/my-feature-slug/screenshots/ first
bash dev/linux/pr-evidence.sh review --flow my-feature-slug --notes "Verified framing, no horizontal scroll"

# After gh pr create: push files to the pr-evidence branch and post/update the PR comment
bash dev/linux/pr-evidence.sh publish --flow my-feature-slug --pr 1234
```

`publish` needs only `gh auth` (git push + PR comment). It:

1. Renders `demo.gif` from the reviewed `demo.mp4` (8 fps, ≤960 px wide, stepped down until it is under 5 MB) because GitHub only plays video inline from `user-attachments`, which has no API.
2. Commits the PNGs, `demo.gif`, and `demo.mp4` to the orphan **`pr-evidence`** branch under `pr-<number>/<flow>/` with git plumbing (a temporary index plus `git commit-tree`), so the working branch and checkout are untouched. Re-publishing replaces that folder.
3. Creates, or edits in place, one comment per flow marked `<!-- pr-visual-evidence:<flow> -->`. Images use `raw.githubusercontent.com/.../pr-evidence/...` URLs, which render inline because the repo is public. The MP4 is linked.

Artifacts land under `tmp/pr-evidence/{flow}/` (gitignored). The weekly **Prune PR evidence** workflow (`.github/workflows/prune-pr-evidence.yml`) deletes folders of PRs closed more than 14 days ago and squashes the branch. The branch carries its own `vercel.json` so Vercel never deploys it.

## Help Center demo methodology (`docs-demo-helpers.ts`)

Issue #1161 standardizes equipqr.info walkthrough videos on desktop **and** mobile:

1. **`settleForDemo`** — after navigation or a major state change, wait for spinners to clear, then hold the fully loaded view ~1s before the next step.
2. **`focusAndClick` / `focusAndFill` / `focusControl`** — scroll the target control fully into view, assert frame quality via `evidence-frame-helpers.ts` (no horizontal overflow, control not clipped), play a dim/blur spotlight that converges on the control, hold ~0.5s, un-dim, then act.
3. **`evidenceScreenshot(page, label, { target })`** — after a demo step, capture with the same frame-quality gate; pass `target` when a specific control must be fully visible in the PNG.

Specs under `e2e/pr-evidence/docs-*.spec.ts` import these helpers. Every control that is clicked must be **fully visible** before the focus animation starts — scroll first when the page is long.

**Post-capture:** walk `visual-review-checklist.md` and run `bash dev/linux/pr-evidence.sh review` before publishing docs-media or PR evidence (see **Visual review** above).

```typescript
import { focusAndClick, settleForDemo } from './shared/docs-demo-helpers';

await settleForDemo(page);
await focusAndClick(page, page.getByRole('button', { name: /invite member/i }));
```

## Documentation media (`docs-media`)

When updating equipqr.info articles, also publish capture artifacts to the public **`docs-media`** bucket (stable paths for docs, not branch-scoped PR paths):

```bash
bash dev/docs-media/workflow.sh publish tmp/pr-evidence/location-maps-desktop/manifest.json location-maps desktop
```

See `docs/public/support/README.md` and `dev/docs-media/workflow.sh`. Docs media still uses Supabase Storage; PR evidence does not.

See `dev/pr-evidence/README.md` for full operator docs.
