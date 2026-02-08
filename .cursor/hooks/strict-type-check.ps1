# strict-type-check.ps1 — afterFileEdit hook for .ts/.tsx files
# 1. Greps for explicit `: any` usage (fast check first).
# 2. Runs tsc --noEmit and reports errors relevant to the edited file.

$inputJson = [Console]::In.ReadToEnd()
$data = $inputJson | ConvertFrom-Json
$filePath = $data.path

# Only check TypeScript / TSX source files
if ($filePath -notmatch "\.(ts|tsx)$") {
    Write-Output '{ "continue": true }'
    exit 0
}

# ── Check 1: Grep for explicit `: any` usage ────────────────────────────
# Matches patterns like  `: any`, `: any[]`, `: any)`, etc.
# Skips single-line comments (//) and block-comment continuations (* ...).
$anyMatches = Select-String -Path $filePath -Pattern ':\s*any\b' -AllMatches -ErrorAction SilentlyContinue |
    Where-Object { $_.Line.TrimStart() -notmatch '^\s*(//|/?\*|\*)' }

if ($anyMatches) {
    $matchDetails = ($anyMatches | ForEach-Object {
        "  Line $($_.LineNumber): $($_.Line.Trim())"
    }) -join "`n"

    $response = @{
        continue      = $false
        agent_message = "Build Failed: explicit 'any' type detected in $filePath. You must define a proper interface or type.`n`nOffending lines:`n$matchDetails"
    }

    Write-Output ($response | ConvertTo-Json -Depth 5)
    exit 1
}

# ── Check 2: Run tsc --noEmit and surface errors for this file ──────────
Write-Host "Type-checking $filePath..."
$tscOutput = cmd /c "npx tsc --noEmit --pretty false 2>&1" | Out-String
$tscExitCode = $LASTEXITCODE

if ($tscExitCode -ne 0) {
    # Normalise the path so we can match it in tsc output (forward-slash)
    $normPath = $filePath -replace '\\', '/'

    $relevantErrors = $tscOutput -split "`r?`n" |
        Where-Object { $_ -match [regex]::Escape((Split-Path $normPath -Leaf)) }

    if ($relevantErrors) {
        $errorSummary = ($relevantErrors | Select-Object -First 15) -join "`n"

        $response = @{
            continue      = $false
            agent_message = "Build Failed: TypeScript compilation errors in $filePath.`n`n$errorSummary"
        }

        Write-Output ($response | ConvertTo-Json -Depth 5)
        exit 1
    }
    # If tsc failed but none of the errors are in *this* file, don't block.
}

# All checks passed
Write-Output '{ "continue": true }'
exit 0
