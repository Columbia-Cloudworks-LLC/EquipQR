## Summary

<!-- Briefly describe what this PR does (1-3 sentences). Focus on the "why" not just the "what". -->

## Type of Change

<!-- Mark the relevant option with [x] -->

- [ ] 🐛 Bug fix (non-breaking change that fixes an issue)
- [ ] ✨ New feature (non-breaking change that adds functionality)
- [ ] 💥 Breaking change (fix or feature that would cause existing functionality to change)
- [ ] 📝 Documentation update
- [ ] ♻️ Refactor (no functional changes)
- [ ] 🎨 Style/UI changes
- [ ] 🧪 Test updates
- [ ] 🔧 Chore (build, CI, dependencies)

## Related Issues

<!-- Link any related issues using "Fixes #123" or "Relates to #456" -->

## Changes Made

<!-- List the key changes in this PR -->

- 
- 
- 

## Screenshots/Videos

**Required for product/runtime PRs:** local-stack screenshots and at least one H.264 MP4 demo video, captured via `scripts/pr-evidence/` and uploaded for inline GitHub display. Paste the generated section from `tmp/pr-evidence/<flow>/evidence-markdown.md` below (or confirm the `<!-- pr-visual-evidence -->` PR comment was posted).

<details open>
<summary>📸 Visual evidence (local dev stack)</summary>

<!-- Agent: run .\scripts\pr-evidence\Invoke-PrEvidence.ps1 -Flow "<slug>" -Spec "e2e/pr-evidence/<feature>.spec.ts" -->
<!-- Paste evidence-markdown.md content here before opening the PR -->

</details>

## Testing

### Test Plan

<!-- Describe how you tested these changes -->

- [ ] Tested locally in development
- [ ] Tested on mobile/responsive views (if applicable)
- [ ] Added/updated unit tests
- [ ] Tested multi-tenancy (different organizations)

### Test Commands Run

```bash
npm run lint       # ✅ / ❌
npm run type-check # ✅ / ❌
npm run test       # ✅ / ❌
npm run build      # ✅ / ❌
```

## Pre-Submission Checklist

<!-- Ensure all items are checked before requesting review -->

- [ ] Code follows the project's [coding standards](../CONTRIBUTING.md#coding-guidelines)
- [ ] No `any` types introduced (use `unknown` if needed)
- [ ] All queries filter by `organization_id` for multi-tenancy
- [ ] RLS policies are respected (no bypassing)
- [ ] No new ESLint warnings or errors
- [ ] No new TypeScript errors
- [ ] Build succeeds without errors
- [ ] Documentation updated (if needed)
- [ ] No sensitive data or secrets in code

## Breaking Changes

<!-- If this is a breaking change, describe the impact and migration steps -->

<details>
<summary>⚠️ Breaking Changes & Migration</summary>

N/A

</details>

## Additional Notes

<!-- Any other context reviewers should know about -->

---

<details>
<summary>📋 Reviewer Guidelines</summary>

- Verify CI checks pass (lint, type-check, tests, security, build)
- Check for proper error handling and user feedback (toasts)
- Ensure components use existing UI primitives from `src/components/ui/`
- Confirm queries use TanStack Query patterns with proper cache keys
- Validate multi-tenancy: all data access includes `organization_id` filter
- For UI changes, validate alignment with `.cursor/rules/design-context.mdc`
- For UI changes, verify mobile technician usability and light/dark readability parity

</details>
