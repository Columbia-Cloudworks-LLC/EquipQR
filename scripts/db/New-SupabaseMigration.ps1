#Requires -Version 5.1
<#
.SYNOPSIS
  Create a Supabase migration file using the pinned local CLI.

.DESCRIPTION
  `supabase migration new` reads optional SQL from stdin. Cursor agent terminals
  (and some CI wrappers) keep stdin open, so a bare `npx supabase migration new`
  can block indefinitely waiting for EOF. This wrapper closes stdin immediately,
  runs from the repo root via the pinned supabase.exe, and on timeout kills only
  the child CLI process started by this invocation.

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

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$supabaseExe = Join-Path $repoRoot 'node_modules\@supabase\cli-windows-x64\bin\supabase.exe'

if (-not (Test-Path -LiteralPath $supabaseExe)) {
  throw "Supabase CLI not found at $supabaseExe. Run npm ci first."
}

$pidFile = Join-Path $env:TEMP ("equipqr-supabase-migration-{0}.pid" -f [guid]::NewGuid().ToString('N'))

Push-Location -LiteralPath $repoRoot
try {
  $job = Start-Job -ScriptBlock {
    param($Exe, $MigrationName, $RepoRoot, $PidFilePath)
    Set-Location -LiteralPath $RepoRoot

    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = $Exe
    $psi.Arguments = "migration new $MigrationName"
    $psi.WorkingDirectory = $RepoRoot
    $psi.RedirectStandardInput = $true
    $psi.RedirectStandardOutput = $true
    $psi.RedirectStandardError = $true
    $psi.UseShellExecute = $false
    $psi.CreateNoWindow = $true

    $process = [System.Diagnostics.Process]::Start($psi)
    if (-not $process) {
      throw 'Failed to start supabase migration new.'
    }

    Set-Content -LiteralPath $PidFilePath -Value $process.Id -Encoding ascii
    $process.StandardInput.Close()

    $stdout = $process.StandardOutput.ReadToEnd()
    $stderr = $process.StandardError.ReadToEnd()
    $process.WaitForExit()

    [pscustomobject]@{
      ExitCode = $process.ExitCode
      Stdout   = $stdout
      Stderr   = $stderr
    }
  } -ArgumentList $supabaseExe, $Name, $repoRoot, $pidFile

  $completed = Wait-Job -Job $job -Timeout $TimeoutSeconds
  if (-not $completed) {
    if (Test-Path -LiteralPath $pidFile) {
      $cliPid = [int](Get-Content -LiteralPath $pidFile -Raw)
      Stop-Process -Id $cliPid -Force -ErrorAction SilentlyContinue
    }
    Stop-Job -Job $job -Force -ErrorAction SilentlyContinue
    Remove-Job -Job $job -Force -ErrorAction SilentlyContinue
    throw "supabase migration new timed out after ${TimeoutSeconds}s."
  }

  $result = Receive-Job -Job $job
  Remove-Job -Job $job -Force

  if ($result.Stdout) {
    Write-Host $result.Stdout.TrimEnd()
  }
  if ($result.Stderr) {
    Write-Host $result.Stderr.TrimEnd()
  }

  if ($result.ExitCode -ne 0) {
    throw "supabase migration new failed with exit code $($result.ExitCode)."
  }

  $outputLines = @()
  if ($result.Stdout) { $outputLines += $result.Stdout -split "`r?`n" }
  if ($result.Stderr) { $outputLines += $result.Stderr -split "`r?`n" }

  $createdLine = $outputLines | Where-Object { $_ -match 'Created new migration at ' } | Select-Object -Last 1
  if (-not $createdLine) {
    throw "supabase migration new did not report a created file."
  }

  if ($createdLine -match 'Created new migration at (.+\.sql)') {
    Write-Output $Matches[1].Trim()
  }
}
finally {
  Remove-Item -LiteralPath $pidFile -Force -ErrorAction SilentlyContinue
  Pop-Location
}
