#Requires -Version 5.1
<#
.SYNOPSIS
  Shared helpers to release Windows file locks on node_modules native binaries
  (tailwindcss-oxide, lightningcss, vite, vitest, eslint) before npm ci.

  Dot-source from other scripts:
    . (Join-Path $PSScriptRoot 'Release-EquipQrNodeModuleLocks.ps1')
#>

function Get-EquipQrRepoRoot {
    param([string]$FromScriptRoot = $PSScriptRoot)

    $root = Split-Path -Parent $FromScriptRoot
    if (-not (Test-Path -LiteralPath (Join-Path $root 'package.json'))) {
        throw "Could not resolve EquipQR repo root from $FromScriptRoot"
    }
    return (Resolve-Path -LiteralPath $root).Path
}

function Get-WinProcessCommandLine {
    param([int]$ProcessId)

    try {
        return (Get-CimInstance Win32_Process -Filter ("ProcessId=$ProcessId")).CommandLine
    } catch {
        return $null
    }
}

function Stop-ProcessesMatchingCommandLine {
    param(
        [Parameter(Mandatory)][string[]]$ProcessNames,
        [Parameter(Mandatory)][string]$Label,
        [Parameter(Mandatory)][string]$MatchRegex,
        [string]$ExcludeRegex = ''
    )

    Write-Host " [$Label] Stopping matching processes..."
    $killed = 0
    foreach ($name in $ProcessNames) {
        $procs = @(Get-Process -Name $name -ErrorAction SilentlyContinue)
        foreach ($proc in $procs) {
            $cmd = Get-WinProcessCommandLine -ProcessId $proc.Id
            if (-not $cmd) { continue }
            if ($ExcludeRegex -and ($cmd -match $ExcludeRegex)) { continue }
            if ($cmd -notmatch $MatchRegex) { continue }
            try {
                Stop-Process -Id $proc.Id -Force -ErrorAction Stop
                Write-Host "        Killed $name PID $($proc.Id)"
                $killed++
            } catch {
                Write-Host "        Could not kill $name PID $($proc.Id): $_"
            }
        }
    }
    if ($killed -eq 0) {
        Write-Host '        Nothing matched - skipped.'
    }
}

function Stop-EquipQrDevToolingProcesses {
    param(
        [Parameter(Mandatory)][string]$RepoRoot
    )

    $repoPattern = [regex]::Escape($RepoRoot) -replace '\\', '[\\/]'
    $repoNamePattern = '(?i)[\\/]EquipQR[\\/]'

    $toolingRegex = @(
        'node_modules[\\/]\.bin[\\/](vite|vitest|eslint)\.(cmd|ps1)?',
        'node_modules[\\/]vite[\\/]',
        'node_modules[\\/]vitest[\\/]',
        'node_modules[\\/]eslint[\\/]',
        'node_modules[\\/]@tailwindcss[\\/]',
        'node_modules[\\/]lightningcss',
        'node_modules[\\/]@esbuild[\\/]',
        'scripts[\\/]dev-vite\.ps1',
        'scripts[\\/]dev-docs\.ps1',
        'scripts[\\/]dev-edge-functions\.ps1',
        'run-vitest-local\.mjs',
        'test-ci-entry\.mjs',
        'test-ci-sharded\.mjs',
        'vite\.config\.(ts|mts|js)',
        'tailwindcss-oxide',
        'lightningcss\.win32'
    ) -join '|'

    $strictMatch = "$repoPattern.*($toolingRegex)|($toolingRegex).*$repoPattern"
    Stop-ProcessesMatchingCommandLine `
        -ProcessNames @('node', 'cmd', 'powershell') `
        -Label 'Node tooling' `
        -MatchRegex $strictMatch `
        -ExcludeRegex '(?i)Release-EquipQrNodeModuleLocks|Invoke-SafeNpmCi|stop-dev-and-e2e'

    # Cursor Vitest/ESLint helpers often load native binaries without a full repo path in argv.
    $broadMatch = "$repoNamePattern.*node_modules|node_modules.*$repoNamePattern"
    Stop-ProcessesMatchingCommandLine `
        -ProcessNames @('node') `
        -Label 'Workspace node_modules' `
        -MatchRegex $broadMatch `
        -ExcludeRegex '(?i)Release-EquipQrNodeModuleLocks|Invoke-SafeNpmCi|stop-dev-and-e2e|npm-cli\.js'
}

function Remove-RepoNodeModulesScrap {
    param(
        [Parameter(Mandatory)][string]$ParentDirectory
    )

    $patterns = @(
        (Join-Path $ParentDirectory 'node_modules.bak-*'),
        (Join-Path $ParentDirectory 'node_modules_broken')
    )

    foreach ($pattern in $patterns) {
        $dirs = @(Get-ChildItem -Path $pattern -Directory -ErrorAction SilentlyContinue)
        foreach ($dir in $dirs) {
            Write-Host " [Cleanup] Removing scrap folder: $($dir.Name)"
            Remove-LockedNodeModules -NodeModulesPath $dir.FullName -RepoRoot $ParentDirectory
        }
    }
}

function Remove-NodeModulesTree {
    param(
        [Parameter(Mandatory)][string]$NodeModulesPath
    )

    if (-not (Test-Path -LiteralPath $NodeModulesPath)) {
        return $true
    }

    try {
        Remove-Item -LiteralPath $NodeModulesPath -Recurse -Force -ErrorAction Stop
        return -not (Test-Path -LiteralPath $NodeModulesPath)
    } catch {
        Write-Host "        WARN: Remove-Item failed for $NodeModulesPath : $_"
    }

    $emptyDir = Join-Path $env:TEMP ("equipqr-empty-{0}" -f [guid]::NewGuid().ToString('N'))
    try {
        New-Item -ItemType Directory -Path $emptyDir -Force | Out-Null
        $robocopyExit = (Start-Process -FilePath 'robocopy.exe' `
            -ArgumentList @($emptyDir, $NodeModulesPath, '/MIR', '/NFL', '/NDL', '/NJH', '/NJS', '/NC', '/NS') `
            -Wait -PassThru -WindowStyle Hidden).ExitCode
        # Robocopy mirror success codes: 0-7
        if ($robocopyExit -le 7) {
            Remove-Item -LiteralPath $NodeModulesPath -Recurse -Force -ErrorAction SilentlyContinue
        }
    } finally {
        Remove-Item -LiteralPath $emptyDir -Recurse -Force -ErrorAction SilentlyContinue
    }

    return -not (Test-Path -LiteralPath $NodeModulesPath)
}

function Remove-LockedNodeModules {
    param(
        [Parameter(Mandatory)][string]$NodeModulesPath,
        [Parameter(Mandatory)][string]$RepoRoot
    )

    if (-not (Test-Path -LiteralPath $NodeModulesPath)) {
        return
    }

    $leaf = Split-Path -Leaf $NodeModulesPath
    Write-Host " [Recovery] Deleting locked $leaf ..."
    Stop-EquipQrDevToolingProcesses -RepoRoot $RepoRoot
    Start-Sleep -Seconds 2

    if (Remove-NodeModulesTree -NodeModulesPath $NodeModulesPath) {
        Write-Host "        Deleted $leaf"
        return
    }

    $scrapRoot = Join-Path $env:TEMP 'equipqr-nm-scrap'
    if (-not (Test-Path -LiteralPath $scrapRoot)) {
        New-Item -ItemType Directory -Path $scrapRoot -Force | Out-Null
    }
    $stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
    $scrapPath = Join-Path $scrapRoot ("{0}-{1}" -f $leaf, $stamp)
    Write-Host "        Delete blocked by file locks; moving scrap to $scrapPath ..."
    Move-Item -LiteralPath $NodeModulesPath -Destination $scrapPath -Force -ErrorAction Stop
    if (Remove-NodeModulesTree -NodeModulesPath $scrapPath) {
        Write-Host '        Removed scrap from TEMP'
    } else {
        Write-Host '        WARN: Scrap remains under TEMP until locks release; workspace path is clear.'
    }
}

function Test-NpmOutputIndicatesFileLock {
    param([string]$Output)

    if ([string]::IsNullOrWhiteSpace($Output)) {
        return $false
    }
    return $Output -match '(?i)EPERM|EBUSY|operation not permitted|resource busy|being used by another process'
}

function Remove-KnownLockedNativePackageDirs {
    param([Parameter(Mandatory)][string]$NodeModulesPath)

    if (-not (Test-Path -LiteralPath $NodeModulesPath)) {
        return
    }

    $targets = @(
        (Join-Path $NodeModulesPath '@tailwindcss'),
        (Join-Path $NodeModulesPath 'lightningcss-win32-x64-msvc'),
        (Join-Path $NodeModulesPath 'lightningcss'),
        (Join-Path $NodeModulesPath '@esbuild')
    )

    Write-Host ' [Recovery] Removing commonly locked native package dirs...'
    foreach ($target in $targets) {
        if (-not (Test-Path -LiteralPath $target)) { continue }
        try {
            Remove-Item -LiteralPath $target -Recurse -Force -ErrorAction Stop
            Write-Host "        Removed $target"
        } catch {
            Write-Host "        WARN: Could not remove $target : $_"
        }
    }
}

function Invoke-EquipQrSafeNpmCi {
    param(
        [Parameter(Mandatory)][string]$WorkingDirectory,
        [string]$NpmPrefix = '',
        [switch]$PreferOffline,
        [switch]$NoAudit,
        [switch]$SkipToolingStop
    )

    $repoRoot = (Get-EquipQrRepoRoot -FromScriptRoot $PSScriptRoot)
    $nodeModulesPath = if ($NpmPrefix) {
        Join-Path $WorkingDirectory (Join-Path $NpmPrefix 'node_modules')
    } else {
        Join-Path $WorkingDirectory 'node_modules'
    }

    $npmArgs = @('ci')
    if ($PreferOffline) { $npmArgs += '--prefer-offline' }
    if ($NoAudit) { $npmArgs += '--no-audit' }

    $label = if ($NpmPrefix) { "npm --prefix $NpmPrefix ci" } else { 'npm ci' }
    $npmExe = (Get-Command npm.cmd -ErrorAction Stop).Source
    Push-Location -LiteralPath $WorkingDirectory
    try {
        for ($attempt = 1; $attempt -le 3; $attempt++) {
            Write-Host " [$label] Attempt $attempt/3..."
            if ($attempt -gt 1 -and -not $SkipToolingStop) {
                Stop-EquipQrDevToolingProcesses -RepoRoot $repoRoot
                Start-Sleep -Seconds 2
            }
            if ($attempt -eq 2) {
                Remove-KnownLockedNativePackageDirs -NodeModulesPath $nodeModulesPath
                Start-Sleep -Seconds 1
            }
            if ($attempt -eq 3) {
                Remove-LockedNodeModules -NodeModulesPath $nodeModulesPath -RepoRoot $repoRoot
            }

            $oldEap = $ErrorActionPreference
            $ErrorActionPreference = 'Continue'
            try {
                $npmArgString = ($npmArgs | ForEach-Object {
                    if ($_ -match '\s') { '"' + $_ + '"' } else { $_ }
                }) -join ' '
                if ($NpmPrefix) {
                    $cmdLine = "`"$npmExe`" --prefix `"$NpmPrefix`" $npmArgString"
                } else {
                    $cmdLine = "`"$npmExe`" $npmArgString"
                }
                $outputLines = cmd.exe /c "$cmdLine 2>&1"
                $exitCode = $LASTEXITCODE
            } finally {
                $ErrorActionPreference = $oldEap
            }
            $output = ($outputLines | Out-String)
            if ($exitCode -eq 0) {
                Write-Host " [$label] OK"
                return
            }

            if ($output.Trim()) {
                Write-Host $output
            }
            if (-not (Test-NpmOutputIndicatesFileLock -Output $output)) {
                throw "$label failed (exit $exitCode)."
            }
            Write-Host " [$label] File lock detected (exit $exitCode)."
        }

        throw "$label failed after lock-recovery attempts."
    } finally {
        Pop-Location
    }
}
