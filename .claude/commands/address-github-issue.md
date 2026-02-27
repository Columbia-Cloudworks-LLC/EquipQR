Discover, analyze, and resolve a GitHub issue for the EquipQR project. Enforces branch discipline, project standards, and strict verification.

$ARGUMENTS

## Steps

1. **Discover & Identify**
   - Run `gh issue list --state open --repo Columbia-Cloudworks-LLC/EquipQR` to find open issues
   - Filter by labels if provided (e.g., `--label bug`, `--label enhancement`)
   - Confirm the Issue Number and Title to work on

2. **Analyze & Contextualize**
   - Read the issue: `gh issue view <number> --repo Columbia-Cloudworks-LLC/EquipQR`
   - Read comments: `gh issue view <number> --repo Columbia-Cloudworks-LLC/EquipQR --comments`
   - Search the codebase for relevant files mentioned in the issue
   - Review project standards in CLAUDE.md

3. **Plan & Branch**
   - Create a dedicated branch: `git checkout -b fix/<issue_number>-<short-description>` or `feat/<issue_number>-<short-description>`
   - Outline the changes required
   - If DB changes needed: follow Supabase migration standards
   - If UI changes needed: follow design system standards

4. **Implement Fixes**
   - Apply code changes in the relevant feature folder (`src/features/...`)
   - Ensure all new components use shadcn/ui
   - If modifying database: create a migration file `YYYYMMDDHHMMSS_description.sql`

5. **Verify (Strict)**
   - Type check: `npx tsc --noEmit`
   - Test: `npm test` or specific test files related to the change
   - Lint: `npm run lint`

6. **Commit & Respond**
   - Create a commit referencing the issue (e.g., `fix: #123 resolve authentication bug`)
   - Post a summary comment on the issue: `gh issue comment <number> --body "Fix implemented in branch [branch-name]. Changes: [summary]. Verified via npm test."`

## Checklist

- [ ] Correct issue selected and analyzed
- [ ] Feature branch created (not on main)
- [ ] Code changes follow tech-stack and coding-standards
- [ ] `npx tsc --noEmit` passed
- [ ] Commit message includes Issue #
- [ ] GitHub comment posted with update
