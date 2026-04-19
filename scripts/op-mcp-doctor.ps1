#Requires -Version 5.1
<#
.SYNOPSIS
  Verify every MCP server EquipQR agents rely on is reachable and authenticated.

.DESCRIPTION
  Runs a non-mutating health check against each MCP server:
    - HTTP servers: HTTP probe with the configured auth headers (resolved from 1Password).
    - stdio servers: verify the launch command resolves on PATH.
    - Plugin-managed servers: verify the plugin folder exists in Cursor's projects/<workspace>/mcps directory.

  Prints a green/red status line per server and exits non-zero if any required server fails.

.PARAMETER SkipPlugins
  Skip the 7 plugin-managed servers (use when running from Cursor Cloud Agent where the local plugin folder is irrelevant).

.PARAMETER VerboseHttp
  Print full HTTP responses on failure (default is just status code).

.EXAMPLE
  .\scripts\op-mcp-doctor.ps1
  .\scripts\op-mcp-doctor.ps1 -SkipPlugins
#>
[CmdletBinding()]
param(
    [switch]$SkipPlugins,
    [switch]$VerboseHttp
)

$ErrorActionPreference = 'Continue'
$results = [System.Collections.Generic.List[psobject]]::new()

function Add-Result {
    param([string]$Server, [string]$Type, [string]$Status, [string]$Detail)
    $results.Add([pscustomobject]@{
        Server = $Server
        Type = $Type
        Status = $Status
        Detail = $Detail
    })
}

function Test-CommandOnPath {
    param([string]$Command)
    return [bool](Get-Command $Command -ErrorAction SilentlyContinue)
}

function Test-PluginFolder {
    param([string]$Server, [string]$Folder)
    $pluginRoot = 'C:\Users\viral\.cursor\projects\c-Users-viral-EquipQR\mcps'
    $path = Join-Path $pluginRoot $Folder
    if (Test-Path -LiteralPath $path) {
        Add-Result -Server $Server -Type 'plugin' -Status 'OK' -Detail $path
    } else {
        Add-Result -Server $Server -Type 'plugin' -Status 'MISSING' -Detail "expected at $path"
    }
}

function Resolve-OpRef {
    param([string]$Ref)
    if (-not (Get-Command op -ErrorAction SilentlyContinue)) { return $null }
    $val = & op read $Ref 2>$null
    if ($LASTEXITCODE -ne 0) { return $null }
    return $val.Trim()
}

function Test-HttpMcp {
    param(
        [string]$Server,
        [string]$Url,
        [hashtable]$Headers
    )

    $resolvedHeaders = @{}
    foreach ($k in $Headers.Keys) {
        $v = $Headers[$k]
        $opRef = $null
        if ($v -match '^Bearer (op://.+)$') {
            $opRef = $matches[1]
        } elseif ($v -match '^(op://.+)$') {
            $opRef = $matches[1]
        }
        if ($opRef) {
            $resolved = Resolve-OpRef -Ref $opRef
            if ([string]::IsNullOrEmpty($resolved)) {
                Add-Result -Server $Server -Type 'http' -Status 'NO-AUTH' -Detail "Could not resolve $opRef from 1Password (Phase 1 may be incomplete)"
                return
            }
            $resolvedHeaders[$k] = $v.Replace($opRef, $resolved)
        } else {
            $resolvedHeaders[$k] = $v
        }
    }

    if (-not $resolvedHeaders.ContainsKey('Accept')) {
        $resolvedHeaders['Accept'] = 'application/json, text/event-stream'
    }

    try {
        $resp = Invoke-WebRequest -Uri $Url -Method POST `
            -Headers $resolvedHeaders `
            -Body '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"op-mcp-doctor","version":"1.0"}}}' `
            -ContentType 'application/json' `
            -TimeoutSec 10 `
            -UseBasicParsing `
            -ErrorAction Stop
        $code = $resp.StatusCode
        if ($code -ge 200 -and $code -lt 300) {
            Add-Result -Server $Server -Type 'http' -Status 'OK' -Detail "HTTP $code"
        } else {
            Add-Result -Server $Server -Type 'http' -Status 'HTTP-ERR' -Detail "HTTP $code"
        }
    } catch [System.Net.WebException] {
        $resp = $_.Exception.Response
        if ($resp) {
            $code = [int]$resp.StatusCode
            if ($code -eq 401 -or $code -eq 403) {
                Add-Result -Server $Server -Type 'http' -Status 'AUTH-FAIL' -Detail "HTTP $code (token rejected)"
            } else {
                Add-Result -Server $Server -Type 'http' -Status 'HTTP-ERR' -Detail "HTTP $code"
            }
        } else {
            Add-Result -Server $Server -Type 'http' -Status 'NET-ERR' -Detail $_.Exception.Message
        }
    } catch {
        Add-Result -Server $Server -Type 'http' -Status 'ERROR' -Detail $_.Exception.Message
    }
}

function Test-StdioMcp {
    param([string]$Server, [string]$Command, [string[]]$Args)
    if (Test-CommandOnPath $Command) {
        Add-Result -Server $Server -Type 'stdio' -Status 'OK' -Detail "$Command on PATH"
    } else {
        Add-Result -Server $Server -Type 'stdio' -Status 'MISSING' -Detail "$Command not on PATH"
    }
}

Write-Host ""
Write-Host "EquipQR MCP Doctor - $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
Write-Host "================================================="
Write-Host ""

if (-not $SkipPlugins) {
    Write-Host "  -- Plugin-managed MCPs (Cursor plugin system) --"
    Test-PluginFolder -Server 'supabase'    -Folder 'plugin-supabase-supabase'
    Test-PluginFolder -Server 'vercel'      -Folder 'plugin-vercel-vercel'
    Test-PluginFolder -Server 'figma'       -Folder 'plugin-figma-figma'
    Test-PluginFolder -Server 'context7'    -Folder 'plugin-context7-plugin-context7'
    Test-PluginFolder -Server 'betterstack' -Folder 'plugin-better-stack-betterstack'
    Test-PluginFolder -Server 'browser'     -Folder 'cursor-ide-browser'
    Test-PluginFolder -Server 'app-control' -Folder 'cursor-app-control'
    Write-Host ""
}

Write-Host "  -- User-level + new MCPs (~/.cursor/mcp.json) --"

$mcpJsonPath = Join-Path $env:USERPROFILE '.cursor\mcp.json'
if (-not (Test-Path -LiteralPath $mcpJsonPath)) {
    Write-Host "  WARN: ~/.cursor/mcp.json missing - run scripts/render-mcp-config.ps1 first" -ForegroundColor Yellow
} else {
    Test-StdioMcp -Server 'todiagram'    -Command 'todiagram.cmd'
    Test-StdioMcp -Server 'playwright'   -Command 'npx.cmd'
    Test-StdioMcp -Server 'gcloud'       -Command 'npx.cmd'

    Test-HttpMcp -Server 'github' -Url 'https://api.githubcopilot.com/mcp/' -Headers @{
        'Authorization'  = 'Bearer op://tgo2m6qbct5otqeqirjocn3joa/github-prod/credential'
        'X-MCP-Readonly' = 'true'
    }

    # Datadog MCP intentionally skipped (cost reduction). To re-enable, uncomment this
    # block and restore the entry in scripts/mcp.template.json.
    # Test-HttpMcp -Server 'datadog' -Url 'https://mcp.us5.datadoghq.com/api/unstable/mcp-server/mcp?toolsets=core' -Headers @{
    #     'DD_API_KEY'         = 'op://tgo2m6qbct5otqeqirjocn3joa/datadog-prod/api_key'
    #     'DD_APPLICATION_KEY' = 'op://tgo2m6qbct5otqeqirjocn3joa/datadog-prod/app_key'
    # }
}

Write-Host ""
Write-Host "================================================="
Write-Host "  Results"
Write-Host "================================================="

$failures = 0
foreach ($r in $results) {
    $color = switch ($r.Status) {
        'OK'        { 'Green' }
        'MISSING'   { 'Red' }
        'AUTH-FAIL' { 'Red' }
        'NO-AUTH'   { 'Yellow' }
        'HTTP-ERR'  { 'Red' }
        'NET-ERR'   { 'Yellow' }
        default     { 'Yellow' }
    }
    if ($r.Status -ne 'OK') { $failures++ }
    Write-Host ("  [{0,-9}] {1,-12} ({2,-6}) {3}" -f $r.Status, $r.Server, $r.Type, $r.Detail) -ForegroundColor $color
}

Write-Host ""
$total = $results.Count
$passed = $total - $failures
Write-Host "  $passed / $total green" -ForegroundColor $(if ($failures -eq 0) { 'Green' } else { 'Yellow' })

exit $failures
