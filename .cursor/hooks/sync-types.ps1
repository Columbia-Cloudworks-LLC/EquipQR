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

$inputJson = [Console]::In.ReadToEnd()
$data = $inputJson | ConvertFrom-Json
$filePath = $data.path

if ($filePath -notmatch "supabase[\\/]migrations[\\/]") {
    exit 0
}

Write-Host "Migration change detected. Regenerating types..."

$typesPath = "src/integrations/supabase/types.ts"
$tempPath = Join-Path $env:TEMP ("supabase-types-{0}.ts" -f ([System.Guid]::NewGuid().ToString('N')))

try {
    # Merge stderr into stdout so we capture banners/errors uniformly.
    # Use cmd /c so npx resolves correctly on Windows.
    cmd /c "npx supabase gen types typescript --local 2>&1" | Out-File -FilePath $tempPath -Encoding utf8

    if (-not (Test-Path -LiteralPath $tempPath) -or (Get-Item -LiteralPath $tempPath).Length -eq 0) {
        Write-Host "ERROR: supabase gen types produced no output. Leaving $typesPath untouched."
        exit 0
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
        exit 0
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

    cmd /c "npx prettier --write $typesPath"
    Write-Host "Types regenerated and validated."
}
finally {
    if (Test-Path -LiteralPath $tempPath) {
        Remove-Item -LiteralPath $tempPath -ErrorAction SilentlyContinue
    }
}

exit 0
