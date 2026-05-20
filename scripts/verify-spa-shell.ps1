#Requires -Version 5.1
<#
.SYNOPSIS
  Verify SPA deep-link routing artifacts after npm run build.

.DESCRIPTION
  Ensures dist/app-shell.html exists and vercel.json / public/_redirects
  both target /app-shell (not stale /index.html fallback).
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
if ($redirectLine -ne '/* /app-shell 200') {
    Fail "public/_redirects must be '/* /app-shell 200' (found: $redirectLine)."
}

Write-Host '[OK] SPA routing contract: dist/app-shell.html, vercel.json, public/_redirects aligned on /app-shell.'
exit 0
