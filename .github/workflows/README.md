# EquipQR GitHub Actions workflows

## 1Password secret-injection migration (in progress)

We are migrating from per-secret GitHub Actions repo secrets to a single
`OP_SERVICE_ACCOUNT_TOKEN` that fetches everything else from the **EquipQR
Agents** 1Password vault at job time. This:

- Eliminates per-secret rotation across N services
- Centralizes audit (every secret access logs in 1Password)
- Lets the `secrets-rotation` skill rotate everything from one place
- Removes the need to keep GitHub Actions Secrets in sync with `.env` files

### Migration status

| Workflow | Status | Secrets to migrate | Replacement |
|---|---|---|---|
| [`ci.yml`](./ci.yml) | TODO | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `CODECOV_TOKEN` | `op://EquipQR Agents/app-env-prod-public/SUPABASE_URL`, `op://EquipQR Agents/app-env-prod-public/SUPABASE_ANON_KEY` (confirm field labels on the item with `op item get` metadata), `op://EquipQR Agents/codecov-token/credential` |
| [`configure-supabase-auth.yml`](./configure-supabase-auth.yml) | TODO | `SUPABASE_ACCESS_TOKEN` | `op://EquipQR Agents/supabase-write/SUPABASE_ACCESS_TOKEN` |
| [`export-schema.yml`](./export-schema.yml) | TODO | `PREVIEW_DATABASE_URL` | `op://EquipQR Agents/preview-database-url/credential` |
| [`production-release-readiness.yml`](./production-release-readiness.yml) | LIVE | `OP_SERVICE_ACCOUNT_TOKEN` + `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`, `VERCEL_TOKEN` via 1Password | `op://EquipQR Agents/supabase-write/SUPABASE_ACCESS_TOKEN`, `op://EquipQR Agents/supabase-write/prod_db_password`, `op://EquipQR Agents/vercel-write/credential` |
| [`deploy.yml`](./deploy.yml) | NEEDS AUDIT | (audit secret references) | TBD |
| [`deployment-status.yml`](./deployment-status.yml) | NEEDS AUDIT | (audit secret references) | TBD |
| [`version-tag.yml`](./version-tag.yml) | NO MIGRATION | only `GITHUB_TOKEN` (built-in) | n/a |
| [`secrets-drift-check.yml`](./secrets-drift-check.yml) | EXAMPLE | demonstrates the new pattern | (none) |

### How to migrate one workflow

Before:

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@de0fac2e4500dabe0009e67214ff5f5447ce83dd
      - run: npm run build
        env:
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
```

After:

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    env:
      OP_SERVICE_ACCOUNT_TOKEN: ${{ secrets.OP_SERVICE_ACCOUNT_TOKEN }}
    steps:
      - uses: actions/checkout@de0fac2e4500dabe0009e67214ff5f5447ce83dd
      - uses: ./.github/actions/load-1p-secrets
        env:
          VITE_SUPABASE_URL:      op://EquipQR Agents/app-env-prod-public/SUPABASE_URL
          VITE_SUPABASE_ANON_KEY: op://EquipQR Agents/app-env-prod-public/SUPABASE_ANON_KEY
      - run: npm run build
        # env vars are auto-injected by the previous step (export-env: true is the default in our composite action)
```

Notes:

- `OP_SERVICE_ACCOUNT_TOKEN` is the **only** repo secret that needs to remain.
- The `supabase-write` item holds Supabase tooling secrets such as `SUPABASE_ACCESS_TOKEN`, `preview_anon_public_key`, and `prod_anon_public_key` (see `AGENTS.md`).
- Secrets loaded by the composite action are auto-masked in logs by 1Password's action.
- The composite action defaults to `export-env: true` so the secrets become env vars in subsequent steps.
- [`secrets-fanout.yml`](./secrets-fanout.yml) runs a **digest check only** (`-Check`) on `push` to `preview` when the sync script or this workflow changes; the 6-hour UTC `schedule` applies preview Edge secrets from 1Password once the workflow exists on `main` (GitHub evaluates schedules from the default branch only). Manual `workflow_dispatch` can still apply or dry-run; production secret apply stays out of this workflow for now.
- For step-output mode (rare), pass `with: { export-env: 'false' }` and reference via `${{ steps.load.outputs.X }}`.

### When to migrate each workflow

Migrate after the corresponding 1Password items exist in the EquipQR Agents
vault. Use [`secrets-drift-check.yml`](./secrets-drift-check.yml) (runs daily)
to confirm the items are present before flipping a workflow.

If you migrate a workflow before the items exist, all PRs will fail with
`op item get: not found` errors. Use the drift-check output as a green light.
