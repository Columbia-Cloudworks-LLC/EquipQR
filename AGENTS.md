## Learned User Preferences

- For editor- and agent-specific workflow guidance in this repo, assume Cursor as the development environment (not generic VS Code or other IDEs).
- After substantive feature or compliance work, the user often asks to update `CHANGELOG.md` (commonly under `[Unreleased]` unless they name a version).
- For privacy and compliance flows, ship obvious in-UI success and failure feedback; the user validates with the browser console and network responses, not only copy.
- For planning work, use the superpowers `writing-plans` skill instead of the deprecated Cursor `/write-plan` command.
- For attached implementation plans, execute the provided plan exactly: do not edit the plan file, reuse existing plan to-dos, and move them through `in_progress` while executing.
- AI infrastructure baseline is Cursor plugin-first; keep only the custom `reflect` command in this repository and avoid reintroducing gstack-driven workflows.
- For release promotion (`/raise` and similar): switch to Plan Mode when gates fail or the audit is ambiguous; ask the developer clarification questions in chat instead of assuming; when raise is allowed and the run is not `--audit-only`, execute push and open the PR without asking for extra confirmation.

## Learned Workspace Facts

- Local dev uses `dev-start.bat`, which injects secrets from 1Password into on-disk `.env` files; Git worktrees and agent runs should rely on those files present in the worktree because automated agents typically cannot access 1Password directly.
- Treat `/` as the canonical marketing URL; keep `/landing` as compatibility only and normalize visitors to `/` while preserving hash and query string.
- Privacy posture work in this codebase includes CCPA/CPRA-oriented gaps: California-specific policy language, a `/privacy-request` intake path backed by the `submit-privacy-request` edge function, and user-level limits on sensitive personal information enforced in scan UX and the database layer.
- Solo-developer release flow: day-to-day work on `preview` only; cut a PR to `main` when releasing (CI/CD runs Supabase migrations and near-prod validation for select users at preview.equipqr.app); pushes to `preview` update that environment; after merging `main`, Vercel refreshes preview and production is promoted manually as a final gate.
- `PROJECT_ROADMAP.md` is the in-repo planning surface alongside GitHub issues and the EquipQR organization project; viewing the org project via `gh` typically needs `read:project`, and mutating project items (status, fields) needs `project` scope.
