#Requires -Version 5.1
<#
.SYNOPSIS
  Sync Vercel project env vars from the EquipQR Agents 1Password vault.

.DESCRIPTION
  For each VITE_* and Vercel-side env var, read the value from 1Password and
  set it via `vercel env add` (or compare via `vercel env ls` if -Check).

  The 1Password source-of-truth items:
    - app-env-prod-public        -> production Vercel env (VITE_* vars)
    - app-env-preview-public     -> preview Vercel env (VITE_* vars)

  Each item must contain individual fields per env var (NOT a multi-line dotenv
  blob) so each can be referenced via op://EquipQR Agents/{item}/{field}.
  Field labels are stored as the lowercase env var name (e.g. `vite_supabase_url`)
  to match the convention used by .github/workflows/edge-functions-smoke-test.yml
  and .github/actions/load-1p-secrets/action.yml. The script normalizes the
  Vars list to lowercase before reading from op.

.PARAMETER Check
  Read-only mode. For each (env, var) pair, lists the variable as drift only
  if it is MISSING from the target Vercel environment (presence-only drift
  detection). Value drift detection requires `vercel env pull` and is not yet
  implemented; if no presence drift is detected the exit code is 0 even though
  values may have drifted. Returns non-zero if presence drift is detected.

.PARAMETER Environment
  Which Vercel environment to sync: 'production' (default), 'preview', or 'all'.

.EXAMPLE
  .\scripts\sync-vercel-from-1password.ps1 -Check
  .\scripts\sync-vercel-from-1password.ps1 -Environment production
#>
[CmdletBinding()]
param(
    [switch]$Check,
    [ValidateSet('production', 'preview', 'all')]
    [string]$Environment = 'all'
)

$ErrorActionPreference = 'Stop'

$VERCEL_TEAM_ID = 'team_78VeGDURoofThjZNJOKEBpP5'
$VERCEL_PROJECT_ID = 'prj_P9hRun4B2OdGy8ACCnb0f7jNG6UA'

# Canonical env var names (uppercase). Reads from 1Password use the lowercase
# field-label form (see notes below); writes to Vercel use the canonical
# uppercase form (Vercel env var names are case-sensitive and must be uppercase).
$ENV_VAR_MAP = @{
    'production' = @{
        OpItem = 'app-env-prod-public'
        Vars = @(
            'VITE_SUPABASE_URL',
            'VITE_SUPABASE_ANON_KEY',
            'VITE_HCAPTCHA_SITEKEY',
            'VITE_SUPER_ADMIN_ORG_ID',
            'VITE_INTUIT_CLIENT_ID',
            'VITE_GOOGLE_WORKSPACE_CLIENT_ID',
            'VITE_GOOGLE_PICKER_API_KEY',
            'VITE_GOOGLE_PICKER_APP_ID',
            'VITE_GOOGLE_MAPS_API_KEY',
            'VITE_VAPID_PUBLIC_KEY'
        )
    }
    'preview' = @{
        OpItem = 'app-env-preview-public'
        Vars = @(
            'VITE_SUPABASE_URL',
            'VITE_SUPABASE_ANON_KEY',
            'VITE_HCAPTCHA_SITEKEY',
            'VITE_SUPER_ADMIN_ORG_ID',
            'VITE_INTUIT_CLIENT_ID',
            'VITE_GOOGLE_WORKSPACE_CLIENT_ID',
            'VITE_GOOGLE_PICKER_API_KEY',
            'VITE_GOOGLE_PICKER_APP_ID',
            'VITE_GOOGLE_MAPS_API_KEY',
            'VITE_VAPID_PUBLIC_KEY'
        )
    }
}

function Write-Step { param([string]$M) Write-Host "  [sync-vercel] $M" }
function Write-Ok   { param([string]$M) Write-Host "  [sync-vercel] OK   $M" -ForegroundColor Green }
function Write-Warn { param([string]$M) Write-Host "  [sync-vercel] WARN $M" -ForegroundColor Yellow }
function Write-Fail { param([string]$M) Write-Host "  [sync-vercel] FAIL $M" -ForegroundColor Red }

# Parse `vercel env ls` output and return the set of env var NAMES that exist
# in the requested environment. The CLI prints a fixed-column table with
# columns: name, value (masked), environments (comma-separated), created.
# We extract the first whitespace-delimited token of each data row and only
# keep rows whose environments column contains $TargetEnv.
function Get-VercelEnvVarNames {
    param(
        [string]$RawOutput,
        [string]$TargetEnv
    )
    $names = New-Object System.Collections.Generic.HashSet[string]
    if ([string]::IsNullOrWhiteSpace($RawOutput)) { return $names }
    foreach ($rawLine in ($RawOutput -split "`r?`n")) {
        $line = $rawLine.Trim()
        if ([string]::IsNullOrWhiteSpace($line)) { continue }
        # Header / banner lines never contain the target env name in their
        # cells AND start with characters like '>' '?' or 'Vercel'. Skip them.
        if ($line -match '^(>|\?|Vercel|name|----|Environment Variables)') { continue }
        # Match VITE_-style names; broader pattern would be \b[A-Z][A-Z0-9_]+\b
        # but Vercel env names are conventionally upper snake.
        if ($line -match '^\s*([A-Z][A-Z0-9_]+)\b.*\b' + [regex]::Escape($TargetEnv) + '\b') {
            [void]$names.Add($matches[1])
        }
    }
    return $names
}

Write-Step "Validating prerequisites..."

if (-not (Get-Command op -ErrorAction SilentlyContinue)) {
    Write-Fail "1Password CLI 'op' not found on PATH."
    exit 1
}
if (-not (Get-Command vercel -ErrorAction SilentlyContinue) -and -not (Get-Command npx -ErrorAction SilentlyContinue)) {
    Write-Fail "Neither 'vercel' nor 'npx' found on PATH. Install Vercel CLI: npm i -g vercel"
    exit 1
}

# Resolve the Vercel CLI as a (command, prefix-args) pair so PowerShell can
# splat it correctly. `& 'npx vercel' env ls` does NOT splat — PS treats the
# whole 'npx vercel' string as the command name and fails with "term not
# recognized". We capture the prefix args (e.g. ['vercel'] when using npx)
# separately so we can do `& $vercelExe @vercelPrefix env ls ...`.
if (Get-Command vercel -ErrorAction SilentlyContinue) {
    $vercelExe = 'vercel'
    $vercelPrefix = @()
    $vercelCmdLabel = 'vercel'
} else {
    $vercelExe = 'npx'
    $vercelPrefix = @('--yes', 'vercel')
    $vercelCmdLabel = 'npx vercel'
}
Write-Ok "Using Vercel CLI: $vercelCmdLabel"

$OP_VAULT = 'tgo2m6qbct5otqeqirjocn3joa'  # EquipQR Agents
$vercelTokenItem = 'vercel-token'
$vercelToken = & op read "op://$OP_VAULT/$vercelTokenItem/credential" 2>$null
if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrEmpty($vercelToken)) {
    Write-Warn "1Password item '$vercelTokenItem' not found. Falling back to existing Vercel CLI session."
    Write-Warn "  To enable headless sync, create item: op://$OP_VAULT/$vercelTokenItem/credential"
    $env:VERCEL_TOKEN = $null
} else {
    $env:VERCEL_TOKEN = $vercelToken.Trim()
    Write-Ok "Vercel token loaded from 1Password"
}

# Set the Vercel CLI's documented headless env vars so we don't need to run
# `vercel link` against an arbitrary checkout. With both vars set, the CLI
# operates against the named project/team without consulting `.vercel/project.json`.
$env:VERCEL_PROJECT_ID = $VERCEL_PROJECT_ID
$env:VERCEL_ORG_ID = $VERCEL_TEAM_ID

$envsToProcess = if ($Environment -eq 'all') { @('production', 'preview') } else { @($Environment) }
$totalDrift = 0
$totalApplied = 0

foreach ($envName in $envsToProcess) {
    Write-Step ""
    Write-Step "Processing Vercel environment: $envName"
    $cfg = $ENV_VAR_MAP[$envName]
    $opItem = $cfg.OpItem

    $itemProbe = & op item get $opItem --vault $OP_VAULT --format json 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Warn "1Password item '$opItem' not found in EquipQR Agents vault. Skipping $envName."
        Write-Warn "  Create with fields: $(($cfg.Vars | ForEach-Object { $_.ToLower() }) -join ', ')"
        continue
    }

    Write-Step "Listing current Vercel env vars for $envName..."
    # Build args incrementally so we only pass --token when we actually have one.
    # Passing `--token ''` consumes the next flag's value (e.g. --scope) which
    # produces confusing CLI errors. When no 1P-loaded token is present we fall
    # through to the developer's existing `vercel login` session.
    $vercelArgs = @($vercelPrefix) + @('env', 'ls', $envName, '--scope', $VERCEL_TEAM_ID)
    if (-not [string]::IsNullOrEmpty($env:VERCEL_TOKEN)) {
        $vercelArgs += @('--token', $env:VERCEL_TOKEN)
    }
    $vercelEnvOutput = & $vercelExe @vercelArgs 2>&1 | Out-String
    if ($LASTEXITCODE -ne 0) {
        Write-Fail "vercel env ls failed: $vercelEnvOutput"
        continue
    }

    # Build the set of env var names currently defined for $envName so -Check
    # can do real (presence) drift detection instead of unconditionally
    # exiting 1 on every variable.
    $existingVars = Get-VercelEnvVarNames -RawOutput $vercelEnvOutput -TargetEnv $envName

    foreach ($var in $cfg.Vars) {
        # 1Password field labels are stored in lowercase to match the
        # convention used by .github/workflows/* and .github/actions/load-1p-secrets.
        $opField = $var.ToLower()
        $opValue = & op read "op://$OP_VAULT/$opItem/$opField" 2>$null
        if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrEmpty($opValue)) {
            Write-Warn "  ${var}: missing in 1Password (op://$OP_VAULT/$opItem/$opField)"
            continue
        }
        $opValue = $opValue.Trim()

        if ($Check) {
            if ($existingVars.Contains($var)) {
                Write-Step "  CHECK: ${var} present in Vercel ($envName) — value-drift not compared (presence-only check)"
            } else {
                Write-Warn "  CHECK: ${var} MISSING from Vercel ($envName) — would be set to a $($opValue.Length)-char value"
                $totalDrift++
            }
        } else {
            Write-Step "  Setting ${var} in ${envName}..."
            $addArgs = @($vercelPrefix) + @('env', 'add', $var, $envName, '--scope', $VERCEL_TEAM_ID, '--force')
            if (-not [string]::IsNullOrEmpty($env:VERCEL_TOKEN)) {
                $addArgs += @('--token', $env:VERCEL_TOKEN)
            }
            $opValue | & $vercelExe @addArgs
            if ($LASTEXITCODE -eq 0) {
                Write-Ok "    ${var} applied"
                $totalApplied++
            } else {
                Write-Fail "    ${var} failed (vercel env add exit $LASTEXITCODE)"
            }
        }
    }
}

Write-Host ""
if ($Check) {
    Write-Step "Drift summary: $totalDrift presence-drift entries (vars present in 1Password but missing from Vercel)"
    Write-Step "  Note: value-drift is not detected by -Check. Use 'vercel env pull' for full value-comparison."
    if ($totalDrift -gt 0) { exit 1 } else { exit 0 }
} else {
    Write-Ok "$totalApplied env vars applied to Vercel"
    exit 0
}
