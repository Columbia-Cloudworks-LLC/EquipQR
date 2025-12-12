# Setup script for Billing Exemptions Dashboard (Issue #232)
# This script helps configure the necessary environment variables and Supabase secrets

$ErrorActionPreference = "Stop"

Write-Host "🔧 Setting up Billing Exemptions Dashboard..." -ForegroundColor Cyan
Write-Host ""

# Super Admin Organization ID (Columbia Cloudworks)
$SUPER_ADMIN_ORG_ID = "dabce056-c0d8-46dd-b173-a3c0084f3133"

# Step 1: Create .env.local file
Write-Host "📝 Step 1: Creating .env.local file..." -ForegroundColor Yellow

$envContent = @"
# Local Development Environment Variables
# Super Admin Organization ID (Columbia Cloudworks)
VITE_SUPER_ADMIN_ORG_ID=$SUPER_ADMIN_ORG_ID

# Add other environment variables as needed
# VITE_SUPABASE_URL=
# VITE_SUPABASE_ANON_KEY=
"@

if (Test-Path ".env.local") {
    Write-Host "⚠️  .env.local already exists. Checking for VITE_SUPER_ADMIN_ORG_ID..." -ForegroundColor Yellow
    $content = Get-Content ".env.local" -Raw
    if ($content -match "VITE_SUPER_ADMIN_ORG_ID") {
        Write-Host "✅ VITE_SUPER_ADMIN_ORG_ID already present in .env.local" -ForegroundColor Green
    } else {
        Add-Content ".env.local" "`n# Super Admin Organization ID (Columbia Cloudworks)`nVITE_SUPER_ADMIN_ORG_ID=$SUPER_ADMIN_ORG_ID"
        Write-Host "✅ Added VITE_SUPER_ADMIN_ORG_ID to .env.local" -ForegroundColor Green
    }
} else {
    Set-Content ".env.local" $envContent
    Write-Host "✅ Created .env.local with VITE_SUPER_ADMIN_ORG_ID" -ForegroundColor Green
}

Write-Host ""
Write-Host "📝 Step 2: Setting Supabase Edge Function Secret..." -ForegroundColor Yellow
Write-Host ""
Write-Host "⚠️  Manual action required:" -ForegroundColor Yellow
Write-Host ""
Write-Host "You need to set the SUPER_ADMIN_ORG_ID secret in Supabase."
Write-Host ""
Write-Host "Option A - Using Supabase CLI (recommended if you have it linked):"
Write-Host ""
Write-Host "  npx supabase secrets set SUPER_ADMIN_ORG_ID=$SUPER_ADMIN_ORG_ID" -ForegroundColor Cyan
Write-Host "  npx supabase functions deploy list-organizations-admin" -ForegroundColor Cyan
Write-Host "  npx supabase functions deploy manage-billing-exemptions" -ForegroundColor Cyan
Write-Host ""
Write-Host "Option B - Using Supabase Dashboard:"
Write-Host ""
# Extract project ref from SUPABASE_URL or use default
$PROJECT_REF = $env:SUPABASE_PROJECT_REF
if (-not $PROJECT_REF -and $env:VITE_SUPABASE_URL) {
    # Extract project ref from URL (e.g., https://xxxxx.supabase.co -> xxxxx)
    if ($env:VITE_SUPABASE_URL -match 'https://([^\.]+)\.supabase\.co') {
        $PROJECT_REF = $matches[1]
    }
}
if (-not $PROJECT_REF) {
    $PROJECT_REF = "ymxkzronkhwxzcdcbnwq"
}
Write-Host "  1. Go to https://supabase.com/dashboard/project/${PROJECT_REF}/settings/functions"
Write-Host "  2. Scroll to 'Secrets' section"
Write-Host "  3. Click 'Add new secret'"
Write-Host "  4. Name: SUPER_ADMIN_ORG_ID"
Write-Host "  5. Value: $SUPER_ADMIN_ORG_ID"
Write-Host "  6. Click 'Save'"
Write-Host "  7. Redeploy both functions from the Edge Functions page"
Write-Host ""
Write-Host "Would you like to try setting the secret via CLI now? (Y/N): " -NoNewline -ForegroundColor Yellow
$response = Read-Host

if ($response -eq 'Y' -or $response -eq 'y') {
    Write-Host ""
    Write-Host "🔐 Attempting to set Supabase secret..." -ForegroundColor Cyan
    
    try {
        Write-Host "Setting SUPER_ADMIN_ORG_ID secret..."
        npx supabase secrets set "SUPER_ADMIN_ORG_ID=$SUPER_ADMIN_ORG_ID"
        
        Write-Host ""
        Write-Host "📦 Redeploying edge functions..." -ForegroundColor Cyan
        Set-Location "supabase\functions"
        npx supabase functions deploy list-organizations-admin
        npx supabase functions deploy manage-billing-exemptions
        Set-Location "..\..\"
        
        Write-Host "✅ Supabase secrets configured and functions redeployed!" -ForegroundColor Green
    }
    catch {
        Write-Host "❌ Error setting up via CLI: $_" -ForegroundColor Red
        Write-Host "Please use the dashboard method instead." -ForegroundColor Yellow
    }
} else {
    Write-Host "⏭️  Skipping CLI setup. Please configure manually using the dashboard." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "✅ Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:"
Write-Host "  1. Restart your dev server: npm run dev" -ForegroundColor Cyan
Write-Host "  2. Log in as admin@equipqr.app" -ForegroundColor Cyan
Write-Host "  3. Switch to Columbia Cloudworks organization" -ForegroundColor Cyan
Write-Host "  4. Navigate to Billing Exemptions Admin page" -ForegroundColor Cyan
Write-Host ""
Write-Host "📚 For detailed documentation, see:" -ForegroundColor Yellow
Write-Host "   - BILLING_EXEMPTIONS_SETUP.md"
Write-Host "   - docs\deployment\edge-function-secrets.md"
Write-Host ""

