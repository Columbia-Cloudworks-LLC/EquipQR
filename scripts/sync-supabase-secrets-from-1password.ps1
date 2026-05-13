#Requires -Version 5.1
<#
.SYNOPSIS
  Sync Supabase Edge Function secrets from the EquipQR Agents 1Password vault.

.DESCRIPTION
  Reads server-side env vars from 1Password and pushes them to Supabase via
  `supabase secrets set --env-file` for the project whose ref is stored on the
  edge item as field `ProjectRef` / `projectref`.

  Token source: op://<vault>/supabase-write/SUPABASE_ACCESS_TOKEN

  Each item must contain individual fields per env var (labels may use any case;
  we read using uppercase canonical names, same as Supabase secret names).

.PARAMETER Check
  Read-only: compare SHA-256 digests from `supabase secrets list -o json` with
  digests of 1Password values. Prints names and match/mismatch only.

.PARAMETER OpItem
  1Password item name: `edge-env-preview-secrets` or `edge-env-prod-secrets`.

.EXAMPLE
  .\scripts\sync-supabase-secrets-from-1password.ps1 -Check -OpItem edge-env-preview-secrets
  .\scripts\sync-supabase-secrets-from-1password.ps1 -OpItem edge-env-preview-secrets
#>
[CmdletBinding()]
param(
    [switch]$Check,
    [Parameter(Mandatory = $false)]
    [string]$OpItem = '',
    [Parameter(Mandatory = $false)]
    [string]$ProjectRef = ''
)

$ErrorActionPreference = 'Stop'

$OP_VAULT = 'tgo2m6qbct5otqeqirjocn3joa'  # EquipQR Agents
$SUPABASE_TOKEN_ITEM = 'supabase-write'
$SUPABASE_TOKEN_FIELD = 'SUPABASE_ACCESS_TOKEN'

$EDGE_ITEM_CONFIG = @{
    'edge-env-preview-secrets' = @{
        AllowedProjectRef = 'olsdirkvvfegvclbpgrg'
        RequiredVars      = @(
            'RESEND_API_KEY',
            'HCAPTCHA_SECRET_KEY',
            'TOKEN_ENCRYPTION_KEY',
            'KDF_SALT',
            'INTUIT_CLIENT_ID',
            'INTUIT_CLIENT_SECRET',
            'GOOGLE_WORKSPACE_CLIENT_ID',
            'GOOGLE_WORKSPACE_CLIENT_SECRET',
            'GOOGLE_MAPS_SERVER_KEY',
            'GOOGLE_MAPS_BROWSER_KEY',
            'GOOGLE_MAPS_MAP_ID',
            'VAPID_PUBLIC_KEY',
            'VAPID_PRIVATE_KEY',
            'VAPID_SUBJECT',
            'PRODUCTION_URL'
        )
        OptionalVars      = @(
            'GITHUB_PAT',
            'GITHUB_WEBHOOK_SECRET',
            'QB_OAUTH_REDIRECT_BASE_URL',
            'GW_OAUTH_REDIRECT_BASE_URL',
            'SUPER_ADMIN_ORG_ID'
        )
    }
    'edge-env-prod-secrets'    = @{
        AllowedProjectRef = 'ymxkzronkhwxzcdcbnwq'
        RequiredVars      = @(
            'RESEND_API_KEY',
            'HCAPTCHA_SECRET_KEY',
            'TOKEN_ENCRYPTION_KEY',
            'KDF_SALT',
            'INTUIT_CLIENT_ID',
            'INTUIT_CLIENT_SECRET',
            'GOOGLE_WORKSPACE_CLIENT_ID',
            'GOOGLE_WORKSPACE_CLIENT_SECRET',
            'GOOGLE_MAPS_SERVER_KEY',
            'GOOGLE_MAPS_BROWSER_KEY',
            'GOOGLE_MAPS_MAP_ID',
            'VAPID_PUBLIC_KEY',
            'VAPID_PRIVATE_KEY',
            'VAPID_SUBJECT',
            'PRODUCTION_URL'
        )
        OptionalVars      = @(
            'GITHUB_PAT',
            'GITHUB_WEBHOOK_SECRET',
            'QB_OAUTH_REDIRECT_BASE_URL',
            'GW_OAUTH_REDIRECT_BASE_URL',
            'SUPER_ADMIN_ORG_ID'
        )
    }
}

$PlaceholderExact = @(
    'test', 'placeholder', 'todo', 'tbd', 'changeme', 'replace-me', 'dummy', 'none', 'null'
)

function Write-Step { param([string]$M) Write-Host "  [sync-supabase] $M" }
function Write-Ok { param([string]$M) Write-Host "  [sync-supabase] OK   $M" -ForegroundColor Green }
function Write-Warn { param([string]$M) Write-Host "  [sync-supabase] WARN $M" -ForegroundColor Yellow }
function Write-Fail { param([string]$M) Write-Host "  [sync-supabase] FAIL $M" -ForegroundColor Red }

function Resolve-OpItemKeyFromProjectRef {
    param([string]$Ref)
    foreach ($kv in $EDGE_ITEM_CONFIG.GetEnumerator()) {
        if ($kv.Value.AllowedProjectRef -eq $Ref) {
            return $kv.Key
        }
    }
    return $null
}

function Get-SecretSha256Hex {
    param([string]$Plain)
    $sha = [System.Security.Cryptography.SHA256]::Create()
    try {
        $bytes = [System.Text.Encoding]::UTF8.GetBytes($Plain)
        $hash = $sha.ComputeHash($bytes)
        return (($hash | ForEach-Object { $_.ToString('x2') }) -join '')
    }
    finally {
        $sha.Dispose()
    }
}

function Normalize-Digest {
    param([string]$Digest)
    if ([string]::IsNullOrWhiteSpace($Digest)) { return '' }
    $d = $Digest.Trim()
    if ($d.StartsWith('sha256:', [System.StringComparison]::OrdinalIgnoreCase)) {
        $d = $d.Substring(7).Trim()
    }
    return $d.ToLowerInvariant()
}

function Test-PlaceholderLike {
    param([string]$Value)
    if ([string]::IsNullOrWhiteSpace($Value)) { return $true }
    $t = $Value.Trim().ToLowerInvariant()
    foreach ($p in $PlaceholderExact) {
        if ($t -ceq $p) { return $true }
    }
    if ($t -match '(?i)\b(placeholder|changeme|replace-me|todo\b|lorem|asdf|xxx)\b') {
        return $true
    }
    return $false
}

function Test-LowEntropyKey {
    param([string]$Key)
    if ([string]::IsNullOrWhiteSpace($Key)) { return $true }
    $chars = $Key.ToCharArray()
    $uniq = ($chars | Select-Object -Unique).Count
    $ratio = $uniq / [Math]::Max($Key.Length, 1)
    if ($ratio -lt 0.3) { return $true }
    $lower = $Key.ToLowerInvariant()
    $weak = @(
        'abcdefghijklmnopqrstuvwxyz', '0123456789', 'qwertyuiop', 'password', 'secret'
    )
    foreach ($w in $weak) {
        if ($lower.Contains($w)) { return $true }
    }
    return $false
}

function Assert-StrongEncryptionKey {
    param([string]$Name, [string]$Value)
    if ($Value.Length -lt 32) {
        throw "$Name must be at least 32 characters (see TOKEN_ENCRYPTION_KEY rules in supabase/functions/_shared/crypto.ts)."
    }
    if (Test-LowEntropyKey $Value) {
        throw "$Name appears to have low entropy (repeated/weak pattern). Use a cryptographically random value."
    }
}

function Assert-StrongKdfSalt {
    param([string]$Name, [string]$Value)
    $encLen = [System.Text.Encoding]::UTF8.GetByteCount($Value)
    if ($encLen -lt 32) {
        throw "$Name must be at least 32 UTF-8 bytes when encoded (see KDF_SALT rules in supabase/functions/_shared/crypto.ts)."
    }
    if (Test-LowEntropyKey $Value) {
        throw "$Name appears to have low entropy. Use: openssl rand -base64 32"
    }
}

function Assert-VapidPrivateKey {
    param([string]$Value)
    if ($Value.Length -lt 40) {
        throw 'VAPID_PRIVATE_KEY is too short to be a valid key material.'
    }
    if (Test-PlaceholderLike $Value) {
        throw 'VAPID_PRIVATE_KEY looks like a placeholder.'
    }
}

function Read-OpFieldRaw {
    param([string]$Item, [string]$FieldLabel)
    $v = & op read "op://$OP_VAULT/$Item/$FieldLabel" 2>$null
    if ($LASTEXITCODE -eq 0 -and -not [string]::IsNullOrWhiteSpace($v)) {
        return $v
    }
    return $null
}

function Read-OpSecretForVar {
    param([string]$Item, [string]$CanonicalName)
    $candidates = @($CanonicalName, $CanonicalName.ToLowerInvariant())
    foreach ($label in $candidates) {
        $v = Read-OpFieldRaw -Item $Item -FieldLabel $label
        if ($null -ne $v) { return $v.Trim() }
    }
    return $null
}

function Read-OpProjectRef {
    param([string]$Item)
    foreach ($label in @('ProjectRef', 'projectref')) {
        $v = Read-OpFieldRaw -Item $Item -FieldLabel $label
        if ($null -ne $v) { return $v.Trim() }
    }
    return $null
}

function Read-SupabaseToken {
    $raw = Read-OpFieldRaw -Item $SUPABASE_TOKEN_ITEM -FieldLabel $SUPABASE_TOKEN_FIELD
    if ([string]::IsNullOrWhiteSpace($raw)) {
        Write-Fail "Missing $SUPABASE_TOKEN_FIELD on 1Password item '$SUPABASE_TOKEN_ITEM'."
        exit 1
    }
    return $raw.Trim()
}

function Get-RemoteDigestMap {
    param([string]$Ref)
    $output = & npx --yes supabase secrets list --project-ref $Ref -o json 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Fail "supabase secrets list failed: $output"
        exit 1
    }
    $joined = ($output | Out-String).Trim()
    $start = $joined.IndexOf('[')
    $end = $joined.LastIndexOf(']')
    if ($start -lt 0 -or $end -le $start) {
        Write-Fail "Could not parse secrets list JSON (no array boundary). First 400 chars: $($joined.Substring(0, [Math]::Min(400, $joined.Length)))"
        exit 1
    }
    $jsonOnly = $joined.Substring($start, $end - $start + 1)
    try {
        $data = $jsonOnly | ConvertFrom-Json
    }
    catch {
        Write-Fail "JSON parse failed after trimming CLI banner: $($_.Exception.Message)"
        exit 1
    }
    if ($data -is [System.Array]) {
        $rows = $data
    }
    else {
        $rows = @($data)
    }
    $map = @{}
    foreach ($row in $rows) {
        if ($null -eq $row.name) { continue }
        $map[$row.name] = Normalize-Digest $row.value
    }
    return $map
}

function Test-ManagedSecretValue {
    param(
        [string]$Name,
        [string]$Value
    )
    if (Test-PlaceholderLike $Value) {
        throw "${Name}: placeholder or empty value is not allowed."
    }
    switch ($Name) {
        'TOKEN_ENCRYPTION_KEY' { Assert-StrongEncryptionKey -Name $Name -Value $Value }
        'KDF_SALT' { Assert-StrongKdfSalt -Name $Name -Value $Value }
        'VAPID_PRIVATE_KEY' { Assert-VapidPrivateKey -Value $Value }
    }
}

function Format-DotEnvQuotedLine {
    param([string]$Name, [string]$Value)
    $q = $Value -replace '\\', '\\\\' -replace '"', '\"' -replace "`r", '\r' -replace "`n", '\n'
    return "${Name}=""$q"""
}

Write-Step 'Validating prerequisites...'
if (-not (Get-Command op -ErrorAction SilentlyContinue)) {
    Write-Fail "1Password CLI 'op' not found on PATH."
    exit 1
}
if (-not (Get-Command npx -ErrorAction SilentlyContinue)) {
    Write-Fail 'npx not found on PATH.'
    exit 1
}

if ([string]::IsNullOrWhiteSpace($OpItem)) {
    if ([string]::IsNullOrWhiteSpace($ProjectRef)) {
        Write-Fail 'Provide -OpItem (preferred) or legacy -ProjectRef (resolved via mapping).'
        exit 1
    }
    $inferred = Resolve-OpItemKeyFromProjectRef -Ref $ProjectRef.Trim()
    if (-not $inferred) {
        Write-Fail "No edge item mapping for project ref '$ProjectRef'."
        exit 1
    }
    $OpItem = $inferred
    Write-Step "Inferred -OpItem '$OpItem' from -ProjectRef '$ProjectRef'."
}

if (-not $EDGE_ITEM_CONFIG.ContainsKey($OpItem)) {
    Write-Fail "Unknown -OpItem '$OpItem'. Expected: $($EDGE_ITEM_CONFIG.Keys -join ', ')"
    exit 1
}

$cfg = $EDGE_ITEM_CONFIG[$OpItem]
$allowedRef = $cfg.AllowedProjectRef

$itemProbe = & op item get $OpItem --vault $OP_VAULT --format json 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Fail "1Password item '$OpItem' not found in EquipQR Agents vault."
    exit 1
}

Write-Step 'Loading Supabase access token from 1Password...'
$saToken = Read-SupabaseToken
$env:SUPABASE_ACCESS_TOKEN = $saToken
Write-Ok "Supabase access token loaded from '$SUPABASE_TOKEN_ITEM' / $SUPABASE_TOKEN_FIELD"

Write-Step 'Reading ProjectRef from 1Password item...'
$refFrom1p = Read-OpProjectRef -Item $OpItem
if ([string]::IsNullOrWhiteSpace($refFrom1p)) {
    Write-Fail "Field 'ProjectRef' (or 'projectref') missing on '$OpItem'."
    exit 1
}
if ($refFrom1p -ne $allowedRef) {
    Write-Fail "ProjectRef mismatch: 1Password has '$refFrom1p' but item '$OpItem' is allow-listed only '$allowedRef'."
    exit 1
}
$ProjectRef = $refFrom1p
Write-Ok "Target project ref=$ProjectRef"

$required = [string[]]$cfg.RequiredVars
$optional = [string[]]$cfg.OptionalVars

# Collect and validate plaintext (preflight)
$resolved = @{}
foreach ($var in $required) {
    $v = Read-OpSecretForVar -Item $OpItem -CanonicalName $var
    if ([string]::IsNullOrWhiteSpace($v)) {
        Write-Fail "${var}: missing in 1Password (item '$OpItem')."
        exit 1
    }
    try {
        Test-ManagedSecretValue -Name $var -Value $v
    }
    catch {
        Write-Fail $_.Exception.Message
        exit 1
    }
    $resolved[$var] = $v
}

foreach ($var in $optional) {
    $v = Read-OpSecretForVar -Item $OpItem -CanonicalName $var
    if ([string]::IsNullOrWhiteSpace($v)) {
        Write-Step "Optional ${var}: not set in 1Password — skipping."
        continue
    }
    try {
        Test-ManagedSecretValue -Name $var -Value $v
    }
    catch {
        Write-Fail $_.Exception.Message
        exit 1
    }
    $resolved[$var] = $v
}

if ($Check) {
    Write-Step "Fetching remote digest map for $ProjectRef..."
    $remote = Get-RemoteDigestMap -Ref $ProjectRef
    $drift = 0
    foreach ($var in $resolved.Keys | Sort-Object) {
        $localPlain = $resolved[$var]
        $localDigest = Get-SecretSha256Hex -Plain $localPlain
        $remoteDigest = ''
        if ($remote.ContainsKey($var)) {
            $remoteDigest = $remote[$var]
        }
        if (-not $remote.ContainsKey($var)) {
            Write-Warn "CHECK: $var — MISSING in Supabase"
            $drift++
        }
        elseif ($localDigest -ne $remoteDigest) {
            Write-Warn "CHECK: $var — DRIFT (digest mismatch)"
            $drift++
        }
        else {
            Write-Ok "CHECK: $var — MATCH"
        }
    }
    Write-Host ''
    if ($drift -gt 0) {
        Write-Fail "Digest drift: $drift secret(s) out of sync."
        exit 1
    }
    Write-Ok 'All managed secrets match Supabase digests.'
    exit 0
}

# Apply via env file
$tempPath = [System.IO.Path]::GetTempFileName()
try {
    $lines = New-Object System.Collections.Generic.List[string]
    foreach ($var in ($resolved.Keys | Sort-Object)) {
        $lines.Add((Format-DotEnvQuotedLine -Name $var -Value $resolved[$var]))
    }
    [System.IO.File]::WriteAllLines($tempPath, $lines, [System.Text.UTF8Encoding]::new($false))

    Write-Step "Applying $($resolved.Count) secrets via supabase secrets set --env-file..."
    $applyOut = & npx --yes supabase secrets set --env-file $tempPath --project-ref $ProjectRef 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Fail "supabase secrets set failed: $applyOut"
        exit 1
    }
    if ($applyOut) {
        Write-Host ($applyOut | Out-String)
    }
    Write-Ok "Secrets applied to project $ProjectRef"
}
finally {
    Remove-Item -LiteralPath $tempPath -Force -ErrorAction SilentlyContinue
}

exit 0
