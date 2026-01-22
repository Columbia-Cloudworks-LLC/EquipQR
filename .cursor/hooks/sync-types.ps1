# Read JSON input from stdin
$inputJson = [Console]::In.ReadToEnd()

# Check if the edited file is a migration file
if ($inputJson -match "supabase/migrations") {
    Write-Host "Migration change detected. Regenerating types..."
    
    # Run the generation command (using cmd /c ensures npx resolves correctly on Windows)
    cmd /c "npx supabase gen types typescript --local > src/integrations/supabase/types.ts"
    
    # Optional: Format the generated file
    cmd /c "npx prettier --write src/integrations/supabase/types.ts"
}

exit 0