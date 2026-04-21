$inputJson = [Console]::In.ReadToEnd()
$data = $inputJson | ConvertFrom-Json

# Extract the file path (safe navigation)
$filePath = $data.path

# Check if it is a source file in src/ and is TypeScript/React
if ($filePath -match "src[\\/].*\.(ts|tsx)$") {
    # Avoid infinite loops by ignoring test files themselves
    if ($filePath -notmatch "\.(test|spec)\.") {
        Write-Host "Running related tests for $filePath..."
        # Invoke npx.cmd directly so we don't spawn an extra cmd.exe console.
        & npx.cmd vitest related "$filePath" --run
    }
}

exit 0