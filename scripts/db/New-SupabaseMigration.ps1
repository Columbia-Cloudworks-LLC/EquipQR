#Requires -Version 5.1
<#
.SYNOPSIS
  Create a Supabase migration file using the pinned local CLI.

.DESCRIPTION
  `supabase migration new` reads optional SQL from stdin. Cursor agent terminals
  (and some CI wrappers) keep stdin open, so a bare `npx supabase migration new`
  can block indefinitely waiting for EOF. This wrapper sends an immediate EOF via
  an empty pipeline, uses node_modules\.bin\supabase.cmd (not npx), and fails
  fast on timeout.

.PARAMETER Name
  Migration slug (snake_case recommended).

.PARAMETER TimeoutSeconds
  Maximum seconds to wait before aborting a stuck CLI process.

.EXAMPLE
  .\scripts\db\New-SupabaseMigration.ps1 -Name add_operator_checkins

.EXAMPLE
  npm run db:migration:new -- add_operator_checkins
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory = $true, Position = 0)]
  [ValidatePattern('^[a-z][a-z0-9_]*$')]
  [string]$Name,

  [ValidateRange(5, 120)]
  [int]$TimeoutSeconds = 30
)

$ErrorActionPreference = 'Stop'

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot '..\..')
$supabaseCmd = Join-Path $repoRoot 'node_modules\.bin\supabase.cmd'

if (-not (Test-Path -LiteralPath $supabaseCmd)) {
  throw "Supabase CLI not found at $supabaseCmd. Run npm ci first."
}

Push-Location $repoRoot
try {
  $job = Start-Job -ScriptBlock {
    param($Cmd, $MigrationName)
    # Empty pipeline closes stdin immediately; avoids hangs when parent stdin stays open.
    '' | & $Cmd migration new $MigrationName 2>&1
  } -ArgumentList $supabaseCmd, $Name

  $completed = Wait-Job -Job $job -Timeout $TimeoutSeconds
  if (-not $completed) {
    Stop-Job -Job $job -Force -ErrorAction SilentlyContinue
    Remove-Job -Job $job -Force -ErrorAction SilentlyContinue
    Get-Process -Name supabase -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
    throw "supabase migration new timed out after ${TimeoutSeconds}s. If this recurs, check for a stuck supabase.exe process."
  }

  $output = @(Receive-Job -Job $job)
  Remove-Job -Job $job -Force

  foreach ($line in $output) {
    Write-Host $line
  }

  $createdLine = $output | Where-Object { $_ -match 'Created new migration at ' } | Select-Object -Last 1
  if (-not $createdLine) {
    throw "supabase migration new did not report a created file. Output:`n$($output -join [Environment]::NewLine)"
  }

  if ($createdLine -match 'Created new migration at (.+\.sql)') {
    Write-Output $Matches[1].Trim()
  }
}
finally {
  Pop-Location
}
