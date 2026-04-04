# guard-migrations.ps1
# Be tolerant to hook payload shape changes across Cursor versions.
$rawInput = [Console]::In.ReadToEnd()
$filePath = ""

if (-not [string]::IsNullOrWhiteSpace($rawInput)) {
    try {
        $data = $rawInput | ConvertFrom-Json -ErrorAction Stop

        if ($null -ne $data.path -and -not [string]::IsNullOrWhiteSpace([string]$data.path)) {
            $filePath = [string]$data.path
        }
        elseif ($null -ne $data.file_path -and -not [string]::IsNullOrWhiteSpace([string]$data.file_path)) {
            $filePath = [string]$data.file_path
        }
    }
    catch {
        # Some hooks can provide plain text; treat it as a path if so.
        $trimmedInput = $rawInput.Trim()
        if ($trimmedInput -and $trimmedInput -notmatch '^[\{\[]') {
            $filePath = $trimmedInput
        }
    }
}

if ([string]::IsNullOrWhiteSpace($filePath)) {
    Write-Output '{ "continue": true }'
    exit 0
}

# Only proceed if we are looking at the migrations folder
if ($filePath -match "supabase[\\/]migrations") {
    
    # Get the most recent migration file (alphabetical sort works for timestamped files)
    $latestMigration = Get-ChildItem "supabase\migrations\*.sql" | Sort-Object Name | Select-Object -Last 1

    # If the file being read is NOT the latest migration, warn the agent.
    $readFileName = Split-Path -Path $filePath -Leaf
    if ($latestMigration -and $readFileName -ne $latestMigration.Name) {
        
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