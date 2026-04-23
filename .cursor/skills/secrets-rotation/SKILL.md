---
name: secrets-rotation
description: Rotate API tokens, service-account keys, and the 1Password Service Account token used by EquipQR Cursor agents. Use when the user mentions rotating secrets, expiring tokens, leaked credentials, the OP service account, or asks "how do I rotate X".
---

# EquipQR Secrets Rotation

## Architecture recap

EquipQR uses 1Password as the single source of truth for all agent-consumed secrets. The `op-svc-equipqr-agents` service account has read-only access to the `EquipQR Agents` vault (UUID `tgo2m6qbct5otqeqirjocn3joa` — scripts use the UUID for speed and to avoid space-in-name parsing issues). Its token (`OP_SERVICE_ACCOUNT_TOKEN`) is planted in:

1. **Cursor Cloud Agent secrets** at <https://cursor.com/dashboard/cloud-agents>
2. **GitHub Actions repo secret** at <https://github.com/Columbia-Cloudworks-LLC/EquipQR/settings/secrets/actions>

(Local Windows uses your interactive `op signin` instead of the service-account token.)

Vendor-side tokens stored in the EquipQR Agents vault all follow the naming convention `equipqr-agent-{readonly|write}-{YYYY-MM}` where the YYYY-MM suffix is the rotation date. This skill parses that suffix to compute age.

## Rotation cadences

| Credential | Cadence | Why |
|---|---|---|
| `OP_SERVICE_ACCOUNT_TOKEN` (the master key) | 90 days | Largest blast radius; aligns with 1Password's recommended max |
| GitHub fine-grained PATs | 90 days | GitHub max for fine-grained PATs |
| Datadog Application Key | 90 days | Datadog has no expiry but RBAC may drift |
| GCP service-account JSON keys | 90 days | NIST recommendation for service-account keys |
| Better Stack API token | 180 days | Lower-risk, single-tier |
| Figma PAT | 180 days | Figma maximum |

## Audit current age

Run from the repo root on Windows:

```powershell
op item list --vault 'EquipQR Agents' --format json | ConvertFrom-Json | ForEach-Object {
    $title = $_.title
    if ($title -match '-(\d{4})-(\d{2})$') {
        $created = [datetime]::new([int]$matches[1], [int]$matches[2], 1)
        $age = ([datetime]::Now - $created).Days
        $color = if ($age -gt 90) { 'Red' } elseif ($age -gt 60) { 'Yellow' } else { 'Green' }
        Write-Host ("{0,-40} {1,4}d old" -f $title, $age) -ForegroundColor $color
    } else {
        Write-Host ("{0,-40} (no date suffix)" -f $title) -ForegroundColor Gray
    }
}
```

For the OP service-account token itself, check the personal-vault item `op-svc-equipqr-agents — token` notes field (the `Last rotated:` line).

## Rotation procedure — vendor PAT (e.g. GitHub, Datadog, Figma, Better Stack)

1. Mint a NEW token in the vendor UI with the same scopes and a name suffix matching the current YYYY-MM. Do NOT delete the old token yet.
2. Update the corresponding 1Password item — replace the `credential` (or `api_key`/`app_key`) field value. Update the item Notes to reflect the new rotation date.
3. Run `.\scripts\op-mcp-doctor.ps1` to confirm the new token is reachable from MCPs.
4. After 24 hours of green doctor runs, **revoke the old token** in the vendor UI.
5. Update the vendor-side token name from `equipqr-agent-readonly-2026-04` to `equipqr-agent-readonly-2026-07` (or the current month).

## Rotation procedure — GCP service-account JSON

1. Open <https://console.cloud.google.com/iam-admin/serviceaccounts?project=equipqr-prod>
2. Click `agent-viewer@equipqr-prod` → **Keys** tab → **Add Key → Create new key → JSON**.
3. Open the new JSON, copy entire contents, paste into 1Password item `gcp-viewer`, field `credential` (overwrite the old value).
4. Run `.\scripts\render-mcp-config.ps1` to write the new key to `%USERPROFILE%\.config\gcloud\equipqr-agent-viewer.json`.
5. Run `.\scripts\op-mcp-doctor.ps1` to verify gcloud MCP still works.
6. After 24 hours, **delete the old key** from the GCP Keys tab.

## Rotation procedure — `OP_SERVICE_ACCOUNT_TOKEN` (the master key)

This is the highest-risk rotation. Follow it precisely.

### Phase A: mint new token

1. Create a NEW service account named `op-svc-equipqr-agents-temp` (the `-temp` suffix avoids name collision):

```powershell
op service-account create "op-svc-equipqr-agents-temp" `
    --vault "EquipQR Agents:read_items" `
    --expires-in 90d
```

   Capture the `ops_...` token output.

### Phase B: distribute the new token

2. Update the Cursor Cloud Agent secret at <https://cursor.com/dashboard/cloud-agents>: edit `OP_SERVICE_ACCOUNT_TOKEN`, paste the new value.
3. Update the GitHub Actions repo secret at <https://github.com/Columbia-Cloudworks-LLC/EquipQR/settings/secrets/actions>: edit `OP_SERVICE_ACCOUNT_TOKEN`, paste the new value.
4. Trigger the [`secrets-drift-check.yml`](https://github.com/Columbia-Cloudworks-LLC/EquipQR/actions/workflows/secrets-drift-check.yml) workflow manually. It must pass with the new token.

### Phase C: cut over

5. Wait 24 hours and confirm at least one Cloud Agent run AND one CI run have used the new token successfully.

### Phase D: revoke old + rename

6. Revoke the OLD service account:

```powershell
op service-account list
op service-account revoke <old-sa-uuid>
```

7. Rename `op-svc-equipqr-agents-temp` back to `op-svc-equipqr-agents` (use the 1Password web UI — CLI rename is not currently supported).
8. Update the personal-vault item `op-svc-equipqr-agents — token` notes: bump `Last rotated:` and `Next rotation due:` dates.

## Cross-platform secret rotation (rotate `<NAME>` across all four platforms)

Use when a secret is consumed by **more than one** of the four runtime platforms — GitHub Actions, Vercel, Supabase Edge Functions, GCP Secret Manager — and rotating it requires updating every place the value lives, in a consistent order, without the app breaking mid-rotation. This is the "AI Administrator" rotation pattern from issue [#644](https://github.com/Columbia-Cloudworks-LLC/EquipQR/issues/644) and is the workflow the user invokes when prompting Cursor with `"rotate <NAME> across all four platforms"`.

### When to use this recipe vs. the per-vendor procedures above

- **Per-vendor procedure (above)** — when the secret lives in only one place (e.g. a GitHub-only PAT used solely by `github-prod` in MCP).
- **This cross-platform recipe** — when the secret is a vendor-shared key like `STRIPE_SECRET_KEY`, `RESEND_API_KEY`, `GOOGLE_MAPS_API_KEY`, `HCAPTCHA_SECRET`, `OPENAI_API_KEY`, etc. that the app reads from `.env` in build (Vercel), runtime (Supabase edge functions), CI (GitHub Actions secrets), and possibly a server-to-server flow (GCP Secret Manager).

### Canonical order — never skip a step, never re-order

1. **Mint the new value at the source vendor.** Use the vendor's UI / API to generate a fresh key. Note the value somewhere ephemeral (clipboard or temp shell variable; never a file). Do NOT revoke the old value yet — the old value must keep working until step 8.

2. **Update the 1Password vault item.** Open the corresponding item in `EquipQR Agents` vault (UUID `tgo2m6qbct5otqeqirjocn3joa`), update the `credential` (or `api_key` / `app_key`) field with the new value. Update the item Notes to reflect today's rotation date and the next-due date (90 or 180 days per the cadence table at the top of this skill).

3. **Propagate to GitHub Actions secrets.** From the repo root:
   ```powershell
   $newValue = op read 'op://tgo2m6qbct5otqeqirjocn3joa/<item>/credential'
   gh secret set <SECRET_NAME> --repo Columbia-Cloudworks-LLC/EquipQR --body $newValue
   ```
   Verify with `gh secret list --repo Columbia-Cloudworks-LLC/EquipQR | Select-String <SECRET_NAME>` (the `Updated` column should show today).

4. **Propagate to Vercel env vars (preview + production).** Until [`scripts/sync-vercel-from-1password.ps1`](../../../scripts/sync-vercel-from-1password.ps1) (Phase 6) lands, do this manually for each environment:
   ```powershell
   $newValue = op read 'op://tgo2m6qbct5otqeqirjocn3joa/<item>/credential'
   vercel env rm <ENV_NAME> production --yes
   $newValue | vercel env add <ENV_NAME> production
   vercel env rm <ENV_NAME> preview --yes
   $newValue | vercel env add <ENV_NAME> preview
   ```
   The remove-then-add pattern is required because `vercel env add` errors when the variable already exists. Trigger a fresh production deployment (`vercel --prod`) so the new value is baked in; preview gets the value on the next preview deploy automatically.

5. **Propagate to Supabase edge function secrets.** Until [`scripts/sync-supabase-secrets-from-1password.ps1`](../../../scripts/sync-supabase-secrets-from-1password.ps1) (Phase 6) lands, do this for each project (production: `ymxkzronkhwxzcdcbnwq`; preview: `olsdirkvvfegvclbpgrg`):
   ```powershell
   $newValue = op read 'op://tgo2m6qbct5otqeqirjocn3joa/<item>/credential'
   supabase secrets set <SECRET_NAME>="$newValue" --project-ref ymxkzronkhwxzcdcbnwq
   supabase secrets set <SECRET_NAME>="$newValue" --project-ref olsdirkvvfegvclbpgrg
   ```
   Edge functions pick up the new value on their next cold start (typically within a few minutes); restart any always-warm functions explicitly via the Supabase dashboard if immediate cutover is required.

6. **Propagate to GCP Secret Manager (only if the secret is consumed by a GCP-side service — Cloud Run, Cloud Functions, Workflows, etc.).** From the repo root, using the `gcloud-write` MCP entry or impersonation flag explicitly:
   ```powershell
   $newValue = op read 'op://tgo2m6qbct5otqeqirjocn3joa/<item>/credential'
   $newValue | gcloud secrets versions add <secret-name> --data-file=- --impersonate-service-account=equipqr-cursor-agent-editor-pr@equipqr-prod.iam.gserviceaccount.com
   ```
   Verify with `gcloud secrets versions list <secret-name> --impersonate-service-account=equipqr-cursor-agent-editor-pr@equipqr-prod.iam.gserviceaccount.com` — the new version should appear at the top with `STATE: ENABLED` and `CREATED: <today>`. If the secret is consumed by a Cloud Run service that mounts a specific version (not `:latest`), update the service's secret-mount config to point at the new version.

7. **Run `.\scripts\op-mcp-doctor.ps1`** to confirm every MCP that consumes the rotated value still authenticates green. The new value should be reachable via every relevant MCP entry. If anything red, **STOP** — investigate before revoking the old value at the vendor (step 8). The old value is your safety net during this verification window.

8. **Revoke the old value at the source vendor — only after 24 hours of green doctor runs and at least one healthy production deploy.** This is the irreversible step; do not rush it. The 24-hour cushion catches consumers you forgot about (cron jobs, scheduled workflows, dormant edge functions). Update the vendor-side token name to reflect today's rotation date (e.g. `equipqr-agent-readonly-2026-04` becomes `equipqr-agent-readonly-2026-07`).

### Per-vendor rotation procedures cited from elsewhere

The four steps above don't replace the per-vendor minting procedures — they sequence them. For the actual click-by-click vendor-side steps, see:

- **GitHub fine-grained PAT minting** — see Service Request #644 [Section C](https://github.com/Columbia-Cloudworks-LLC/EquipQR/issues/644#issuecomment-4283556330) (re-validated 2026-04-20 against `https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens`).
- **GCP service-account JSON key creation** — see Service Request #644 [Section D](https://github.com/Columbia-Cloudworks-LLC/EquipQR/issues/644#issuecomment-4283556330) (re-validated 2026-04-20 against `https://cloud.google.com/iam/docs/keys-create-delete`). Note: under the AGENTS.md line 25 hybrid impersonation pattern, the `gcp-editor` JSON key is vestigial; rotation is rarely needed.
- **Datadog API / Application keys** — see Service Request #644 [Section B](https://github.com/Columbia-Cloudworks-LLC/EquipQR/issues/644#issuecomment-4283556330) for the OTR-mode caveat (Application Keys created after Aug 2025 are visible only at creation; lost values cannot be recovered, only re-minted).

## Compromise / leak response

If you suspect any vendor token has leaked:

1. **Revoke immediately** in the vendor UI (don't wait for rotation).
2. Mint a replacement.
3. Update 1Password item.
4. Run doctor to confirm no other consumer is broken.
5. Audit `op item edit` history at <https://my.1password.com/security/activity> to confirm no unauthorized access.

If `OP_SERVICE_ACCOUNT_TOKEN` itself leaks: follow the master-key rotation above, but skip the 24-hour wait — revoke the old SA immediately after the new one is in place. Accept brief CI/Cloud-Agent breakage as the price of containment.
