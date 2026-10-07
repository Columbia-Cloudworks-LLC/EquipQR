# EquipQR Agent Guidelines

EquipQR is a multi-tenant fleet maintenance application for equipment QR tracking, work orders, preventative maintenance, inventory, and field teams.

- **Frontend:** React 19, TypeScript (strict), Vite SPA, TanStack Query, Tailwind CSS.
- **Backend:** Supabase (PostgreSQL with Row Level Security, Auth, Storage) and Supabase Edge Functions (Deno).
- **Integrations:** QuickBooks Online API, Google Workspace API.
- **Live Domains:** App: [equipqr.app](https://equipqr.app) | Preview: [preview.equipqr.app](https://preview.equipqr.app) | Repository: [github.equipqr.app](https://github.equipqr.app)

---

## 1. Operating Rules for Antigravity

1. **Canonical Development Environment:**
   All tooling, Node.js scripts, and git operations run inside Ubuntu WSL2:
   `/home/viralarchitect/projects/EquipQR`
   The Windows launcher is `dev/equipqr.bat` (`start`, `stop`, `status`, `reset`).
   The Linux lifecycle script is `bash dev/linux/dev.sh start|stop|status|reset`.

2. **Deterministic Quality Gates:**
   - **Zero `as unknown as` or `as any`:** Never bypass TypeScript typing. Inherit generated schema types from `src/integrations/supabase/types.ts` (`Tables<'table_name'>`).
   - **Strict TypeScript Compliance:** Code changes must be clean under `npx tsc --noEmit`.
   - **Strict Linter Compliance:** Must pass `npm run lint:all`.
   - **Test Integrity:** Relevant unit and component tests (`npm test`) must pass before concluding tasks.

3. **Security & Authorization Boundaries:**
   - Always enforce tenant isolation via `organization_id` filters and PostgreSQL Row Level Security (RLS).
   - In Supabase Edge Functions, default to `createUserSupabaseClient(req)` + `requireUser(req, supabase)`.
   - Never use `createAdminSupabaseClient()` (service-role key) in public endpoints (`verify_jwt = false`) without documented token-scoped verification.

4. **No Unrequested Refactoring:**
   - Touch only the files and systems explicitly requested.
   - Do not refactor adjacent modules, rewrite working patterns, or add unneeded dependencies.

---

## 2. Core Documentation & References

| Topic | Reference Document |
| :--- | :--- |
| Documentation Map | [docs/README.md](docs/README.md) |
| Git Branching & Deploy Train | [docs/ops/git-and-deploy.md](docs/ops/git-and-deploy.md) |
| Secrets & Access Tiers | [docs/ops/agent-secrets-and-access.md](docs/ops/agent-secrets-and-access.md) |
| Linux & WSL2 Setup | [docs/ops/linux-development.md](docs/ops/linux-development.md) |
| Database Migrations | [docs/ops/migrations.md](docs/ops/migrations.md) |
| Edge Function Auth Patterns | [docs/edge-functions/auth-patterns.md](docs/edge-functions/auth-patterns.md) |
| Permissions & RBAC | [docs/guides/permissions.md](docs/guides/permissions.md) |
| Testing Guidelines | [docs/technical/testing-guidelines.md](docs/technical/testing-guidelines.md) |
| Verification Gate Skill | [.agents/skills/verify-gate/SKILL.md](.agents/skills/verify-gate/SKILL.md) |
| Edge Functions Skill | [.agents/skills/edge-functions/SKILL.md](.agents/skills/edge-functions/SKILL.md) |
| Git & Deploy Skill | [.agents/skills/git-and-deploy/SKILL.md](.agents/skills/git-and-deploy/SKILL.md) |
