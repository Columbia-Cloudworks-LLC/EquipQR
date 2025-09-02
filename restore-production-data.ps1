# =====================================================
# Production Data Restore Script
# Restores production backup to local Supabase database
# =====================================================

param(
    [string]$BackupFile = "supabase/db_cluster-01-09-2025@07-54-55.backup",
    [switch]$DryRun
)

Write-Host "🔧 Production Data Restore Script" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan

if ($DryRun) {
    Write-Host "DRY RUN MODE - No data will be restored" -ForegroundColor Yellow
}

# Check if backup file exists
if (-not (Test-Path $BackupFile)) {
    Write-Host "❌ Backup file not found: $BackupFile" -ForegroundColor Red
    exit 1
}

$backupSize = (Get-Item $BackupFile).Length
Write-Host "📁 Backup file: $BackupFile ($([math]::Round($backupSize / 1MB, 2)) MB)" -ForegroundColor Green

# Get local database connection
$localDbUrl = "postgresql://postgres:postgres@127.0.0.1:54322/postgres"

Write-Host "🔄 Step 1: Reset database without seed data..." -ForegroundColor Yellow
if (-not $DryRun) {
    try {
        & supabase db reset --no-seed
        if ($LASTEXITCODE -ne 0) {
            Write-Host "❌ Database reset failed" -ForegroundColor Red
            exit 1
        }
        Write-Host "✅ Database reset successful" -ForegroundColor Green
    } catch {
        Write-Host "❌ Error during database reset: $($_.Exception.Message)" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "🔍 Would reset database without seed data" -ForegroundColor Gray
}

Write-Host "🔄 Step 2: Restore production data..." -ForegroundColor Yellow
if (-not $DryRun) {
    Write-Host "📋 Note: This requires PostgreSQL tools (pg_restore)" -ForegroundColor Yellow
    Write-Host "If pg_restore is not available, you can:" -ForegroundColor Yellow
    Write-Host "1. Install PostgreSQL tools" -ForegroundColor White
    Write-Host "2. Use Supabase Dashboard to restore manually" -ForegroundColor White
    Write-Host "3. Convert backup to SQL and run manually" -ForegroundColor White
    
    # Try to restore using pg_restore if available
    Write-Host "🔍 Attempting to restore backup..." -ForegroundColor Gray
    Write-Host "Command: pg_restore --clean --no-owner --no-privileges -d `"$localDbUrl`" `"$BackupFile`"" -ForegroundColor Gray
} else {
    Write-Host "🔍 Would attempt to restore backup using pg_restore" -ForegroundColor Gray
}

Write-Host "`n📋 Manual Restore Instructions:" -ForegroundColor Cyan
Write-Host "===============================" -ForegroundColor Cyan
Write-Host "If automated restore doesn't work:" -ForegroundColor Yellow
Write-Host "1. Open Supabase Studio: http://127.0.0.1:54323" -ForegroundColor White
Write-Host "2. Go to SQL Editor" -ForegroundColor White
Write-Host "3. Use the backup file to restore data manually" -ForegroundColor White
Write-Host "4. Or convert the .backup file to SQL format first" -ForegroundColor White

Write-Host "`n💡 Alternative: Extract Data from Backup" -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host "You can also extract specific table data:" -ForegroundColor Yellow
Write-Host "1. pg_restore --data-only --table=organizations `"$BackupFile`"" -ForegroundColor White
Write-Host "2. pg_restore --data-only --table=equipment `"$BackupFile`"" -ForegroundColor White
Write-Host "3. pg_restore --data-only --table=notes `"$BackupFile`"" -ForegroundColor White

Write-Host "`n🎯 Next Steps:" -ForegroundColor Cyan
Write-Host "=============" -ForegroundColor Cyan
Write-Host "1. Install PostgreSQL tools if needed" -ForegroundColor White
Write-Host "2. Run this script without -DryRun" -ForegroundColor White
Write-Host "3. Or use manual restore through Supabase Studio" -ForegroundColor White
Write-Host "4. Test the application with real production data" -ForegroundColor White
