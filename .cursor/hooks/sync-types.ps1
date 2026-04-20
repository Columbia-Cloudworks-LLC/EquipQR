# Cursor hook: regenerate Supabase TypeScript types after a migration edit.
#
# Reads JSON from stdin (same pattern as guard-migrations.ps1 / run-tests.ps1).
# When the edited file is a Supabase migration, runs `supabase gen types` and
# writes the result to src/integrations/supabase/types.ts.
#
# Why the validation/extraction logic exists:
# The Supabase CLI (~v2.77) writes ancillary messages to stdout (not stderr),
# including connection logs ("Connecting to db 5432") and CLI update banners
# ("A new version of Supabase CLI is available..."). A naive `> types.ts`
# redirect captures those lines into the generated file, producing TypeScript
# that does not compile. This script captures stdout+stderr together, then
# extracts only the content between the first `export type` declaration and
# the last `} as const`. Anything outside that range is treated as noise.
# If either anchor is missing, the existing types.ts is left untouched and
# the captured output is echoed so the developer can see what the CLI did.
#
# This hook is intentionally non-blocking: every exit path is `exit 0`, and
# any unexpected terminating error is caught and logged so it cannot abort
# Cursor's edit pipeline.

# Defensive stdin parsing — match the pattern used in guard-migrations.ps1
# so the hook tolerates payload changes or non-JSON input.
$filePath = $null
try {
    $inputJson = [Console]::In.ReadToEnd()
    if ([string]::IsNullOrWhiteSpace($inputJson)) {
        exit 0
    }
    $data = $inputJson | ConvertFrom-Json -ErrorAction Stop
    $filePath = $data.path
} catch {
    Write-Host "WARNING: sync-types hook could not parse stdin payload: $_"
    exit 0
}

if (-not $filePath -or $filePath -notmatch "supabase[\\/]migrations[\\/]") {
    exit 0
}

Write-Host "Migration change detected. Regenerating types..."

$typesPath = "src/integrations/supabase/types.ts"
$tempPath = Join-Path $env:TEMP ("supabase-types-{0}.ts" -f ([System.Guid]::NewGuid().ToString('N')))

try {
    # Merge stderr into stdout so we capture banners/errors uniformly.
    # Invoke npx.cmd directly (& operator) instead of `cmd /c` so we don't
    # spawn an extra cmd.exe console window on Windows GUI parents.
    & npx.cmd supabase gen types typescript --local 2>&1 | Out-File -FilePath $tempPath -Encoding utf8

    if (-not (Test-Path -LiteralPath $tempPath) -or (Get-Item -LiteralPath $tempPath).Length -eq 0) {
        Write-Host "ERROR: supabase gen types produced no output. Leaving $typesPath untouched."
        return
    }

    $rawContent = Get-Content -LiteralPath $tempPath -Raw

    $startMatch = [regex]::Match($rawContent, '(?m)^export type ')
    $endMatches = [regex]::Matches($rawContent, '(?m)^} as const\s*$')

    if (-not $startMatch.Success -or $endMatches.Count -eq 0) {
        Write-Host "ERROR: Generated output did not contain expected TypeScript markers."
        Write-Host "Leaving $typesPath untouched. CLI output (truncated to 1000 chars):"
        Write-Host "----"
        Write-Host ($rawContent.Substring(0, [Math]::Min(1000, $rawContent.Length)))
        Write-Host "----"
        return
    }

    $endMatch = $endMatches[$endMatches.Count - 1]
    $startIdx = $startMatch.Index
    $endIdx = $endMatch.Index + $endMatch.Length
    $cleanContent = $rawContent.Substring($startIdx, $endIdx - $startIdx).TrimEnd() + "`n"

    # Atomic-ish write with explicit UTF-8 + BOM to match the pre-existing
    # file encoding. Using the .NET API avoids the Windows PowerShell 5.1
    # vs PowerShell 7+ encoding-default differences in Set-Content/Out-File.
    $utf8Bom = [System.Text.UTF8Encoding]::new($true)
    [System.IO.File]::WriteAllText((Resolve-Path -LiteralPath ".").Path + "\$typesPath", $cleanContent, $utf8Bom)

    # Capture prettier output so we can surface failures instead of silently
    # printing "validated" when formatting actually broke. Direct .cmd invocation
    # avoids spawning a visible cmd.exe console window.
    $prettierOutput = & npx.cmd prettier --write $typesPath 2>&1
    $prettierExit = $LASTEXITCODE
    if ($prettierExit -ne 0) {
        $combined = if ($prettierOutput) { ($prettierOutput -join "`n") } else { '<no output>' }
        $excerpt = if ($combined.Length -gt 500) { $combined.Substring(0, 500) } else { $combined }
        Write-Host "WARNING: prettier exited with code $prettierExit while formatting $typesPath."
        Write-Host "----prettier output (truncated to 500 chars)----"
        Write-Host $excerpt
        Write-Host "----"
        Write-Host "Types regenerated; formatting step did not complete cleanly."
    } else {
        Write-Host "Types regenerated and validated."
    }
}
catch {
    # Catch any unexpected terminating error (file I/O, regex bounds, etc.)
    # so the hook never aborts the Cursor edit pipeline with a non-zero exit.
    Write-Host "WARNING: sync-types hook encountered an unexpected error: $_"
    if ($_.ScriptStackTrace) {
        Write-Host $_.ScriptStackTrace
    }
}
finally {
    if (Test-Path -LiteralPath $tempPath) {
        Remove-Item -LiteralPath $tempPath -ErrorAction SilentlyContinue
    }
}

exit 0
