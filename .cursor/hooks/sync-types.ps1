# Read JSON input from stdin and parse it (same pattern as guard-migrations.ps1 / run-tests.ps1)
$inputJson = [Console]::In.ReadToEnd()
$data = $inputJson | ConvertFrom-Json
$filePath = $data.path

# Check if the edited file is a migration file (match against path, not raw JSON, so Windows escaped backslashes work)
if ($filePath -match "supabase[\\/]migrations[\\/]") {
    Write-Host "Migration change detected. Regenerating types..."
    
    # Run the generation command (using cmd /c ensures npx resolves correctly on Windows)
    cmd /c "npx supabase gen types typescript --local > src/integrations/supabase/types.ts"
    
    # Optional: Format the generated file
    cmd /c "npx prettier --write src/integrations/supabase/types.ts"
}

exit 0