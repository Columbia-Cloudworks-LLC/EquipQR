#Requires -Version 5.1
<#
.SYNOPSIS
  Verify SPA deep-link routing artifacts after npm run build.

.DESCRIPTION
  Ensures dist/app-shell.html exists and platform configs target the correct
  SPA fallback: Vercel uses cleanUrls /app-shell; Netlify/_redirects use
  /app-shell.html (literal build artifact).
#>
param(
    [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
)

$ErrorActionPreference = 'Stop'

function Fail([string]$Message) {
    Write-Error $Message
    exit 1
}

$distAppShell = Join-Path $RepoRoot 'dist\app-shell.html'
if (-not (Test-Path -LiteralPath $distAppShell)) {
    Fail "Missing dist/app-shell.html. Run npm run build first."
}

$vercelPath = Join-Path $RepoRoot 'vercel.json'
if (-not (Test-Path -LiteralPath $vercelPath)) {
    Fail "Missing vercel.json at repo root."
}

$vercel = Get-Content -LiteralPath $vercelPath -Raw -Encoding UTF8 | ConvertFrom-Json
$rewrite = @($vercel.rewrites | Where-Object { $_.destination -match 'app-shell|index\.html' } | Select-Object -First 1)
if (-not $rewrite) {
    Fail "vercel.json has no SPA fallback rewrite."
}
if ($rewrite.destination -ne '/app-shell') {
    Fail "vercel.json rewrite destination must be /app-shell (found: $($rewrite.destination))."
}

$redirectsPath = Join-Path $RepoRoot 'public\_redirects'
if (-not (Test-Path -LiteralPath $redirectsPath)) {
    Fail "Missing public/_redirects."
}

$redirectLine = (Get-Content -LiteralPath $redirectsPath -Encoding UTF8 | Select-Object -First 1).Trim()
if ($redirectLine -ne '/* /app-shell.html 200') {
    Fail "public/_redirects must be '/* /app-shell.html 200' (found: $redirectLine)."
}

$netlifyPath = Join-Path $RepoRoot 'netlify.toml'
if (-not (Test-Path -LiteralPath $netlifyPath)) {
    Fail "Missing netlify.toml at repo root."
}

$netlifyContent = Get-Content -LiteralPath $netlifyPath -Raw -Encoding UTF8
if ($netlifyContent -notmatch 'to\s*=\s*"/app-shell\.html"') {
    Fail "netlify.toml SPA redirect must target /app-shell.html."
}

Write-Host '[OK] SPA routing contract: dist/app-shell.html; Vercel -> /app-shell; Netlify/_redirects -> /app-shell.html.'
exit 0
