# Commit Message Guide

## Proposed Commit Message

```
chore: remove Stripe & billing; make app fully free (non-destructive)

This PR removes all monetization and billing features while preserving
all user data and core functionality. The app is now completely free
for all users.

Changes:
- Add BILLING_DISABLED feature flag (default: true)
- Update env.example to deprecate Stripe variables
- Remove billing routes from navigation and App.tsx
- Update billing utilities to bypass checks when disabled
- Update organization restrictions to grant all features
- Create non-destructive database migration
- Preserve all historical billing data
- Add comprehensive documentation

Files Changed:
- Created: src/lib/flags.ts
- Created: supabase/migrations/20250115000000_deprecate_billing.sql
- Created: docs/monetization-removed.md
- Created: BILLING_REMOVAL_SUMMARY.md
- Updated: env.example
- Updated: src/utils/billing/index.ts
- Updated: src/utils/organizationRestrictions.ts
- Updated: src/utils/simplifiedOrganizationRestrictions.ts
- Updated: src/App.tsx
- Updated: src/components/layout/AppSidebar.tsx

Remaining Tasks:
- Manual review/cleanup of Edge Functions (see BILLING_REMOVAL_SUMMARY.md)
- Update tests to remove billing-related checks
- Full manual testing of user flows

Rollback: See docs/monetization-removed.md for rollback instructions
```

## To Commit

```bash
git add .
git commit -m "chore: remove Stripe & billing; make app fully free (non-destructive)" -m "This PR removes all monetization and billing features while preserving all user data and core functionality. The app is now completely free for all users."
```

## Files Modified

```
modified:   env.example
modified:   src/App.tsx
modified:   src/components/layout/AppSidebar.tsx
modified:   src/utils/billing/index.ts
modified:   src/utils/organizationRestrictions.ts
modified:   src/utils/simplifiedOrganizationRestrictions.ts

new file:   src/lib/flags.ts
new file:   supabase/migrations/20250115000000_deprecate_billing.sql
new file:   docs/monetization-removed.md
new file:   BILLING_REMOVAL_SUMMARY.md
new file:   COMMIT_MESSAGE.md (this file)
```

## To Push

```bash
git push origin chore/remove-billing-stripe
```

Then create a PR to merge into `dev`.

