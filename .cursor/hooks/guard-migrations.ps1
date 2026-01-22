$inputJson = [Console]::In.ReadToEnd()
$data = $inputJson | ConvertFrom-Json
$filePath = $data.path

# Only proceed if we are looking at the migrations folder
if ($filePath -match "supabase[\\/]migrations") {
    
    # Get the most recent migration file (alphabetical sort works for timestamped files)
    $latestMigration = Get-ChildItem "supabase\migrations\*.sql" | Sort-Object Name | Select-Object -Last 1

    # If the file being read is NOT the latest migration, block it
    if ($latestMigration -and $filePath -notmatch $latestMigration.Name) {
        
        # Construct the JSON response to block the agent
        $response = @{
            continue = $true
            user_message = "Warning: You are accessing a committed migration file."
            agent_message = "I see I am accessing an old migration ($($latestMigration.Name) is newer). I must NOT edit this file as it is already applied. I should create a new migration instead."
        }

        # Output JSON and exit
        Write-Output ($response | ConvertTo-Json -Depth 5)
        exit 0
    }
}

# Allow operation if no issues found
Write-Output '{ "continue": true }'
exit 0