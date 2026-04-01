#!/bin/bash

# Setup script for Billing Exemptions Dashboard (Issue #232)
# This script helps configure the necessary environment variables and Supabase secrets

set -e

echo "🔧 Billing Exemptions setup helper (legacy)..."
echo ""

# Super Admin Organization ID (Columbia Cloudworks)
SUPER_ADMIN_ORG_ID="dabce056-c0d8-46dd-b173-a3c0084f3133"

# Step 1: Create .env.local file
echo "📝 Step 1: Creating .env.local file..."
if [ -f ".env.local" ]; then
    echo "⚠️  .env.local already exists. Adding VITE_SUPER_ADMIN_ORG_ID if missing..."
    if grep -q "VITE_SUPER_ADMIN_ORG_ID" .env.local; then
        echo "✅ VITE_SUPER_ADMIN_ORG_ID already present in .env.local"
    else
        echo "" >> .env.local
        echo "# Super Admin Organization ID (Columbia Cloudworks)" >> .env.local
        echo "VITE_SUPER_ADMIN_ORG_ID=$SUPER_ADMIN_ORG_ID" >> .env.local
        echo "✅ Added VITE_SUPER_ADMIN_ORG_ID to .env.local"
    fi
else
    cat > .env.local << EOF
# Local Development Environment Variables
# Super Admin Organization ID (Columbia Cloudworks)
VITE_SUPER_ADMIN_ORG_ID=$SUPER_ADMIN_ORG_ID

# Add other environment variables as needed
# VITE_SUPABASE_URL=
# VITE_SUPABASE_ANON_KEY=
EOF
    echo "✅ Created .env.local with VITE_SUPER_ADMIN_ORG_ID"
fi

echo ""
echo "📝 Step 2: Setting Supabase Edge Function Secret..."
echo ""
echo "⚠️  Manual action required:"
echo ""
echo "You need to set the SUPER_ADMIN_ORG_ID secret in Supabase."
echo ""
echo "Option A - Using Supabase CLI (recommended if you have it linked):"
echo ""
echo "  npx supabase secrets set SUPER_ADMIN_ORG_ID=$SUPER_ADMIN_ORG_ID"
echo "  npx supabase functions deploy list-organizations-admin"
echo ""
echo "Option B - Using Supabase Dashboard:"
echo ""
# Extract project ref from SUPABASE_URL or use default
PROJECT_REF="${SUPABASE_PROJECT_REF:-ymxkzronkhwxzcdcbnwq}"
if [ -n "$VITE_SUPABASE_URL" ]; then
    # Extract project ref from URL (e.g., https://xxxxx.supabase.co -> xxxxx)
    PROJECT_REF=$(echo "$VITE_SUPABASE_URL" | sed -n 's|https://\([^.]*\)\.supabase\.co.*|\1|p')
fi
echo "  1. Go to https://supabase.com/dashboard/project/${PROJECT_REF}/settings/functions"
echo "  2. Scroll to 'Secrets' section"
echo "  3. Click 'Add new secret'"
echo "  4. Name: SUPER_ADMIN_ORG_ID"
echo "  5. Value: $SUPER_ADMIN_ORG_ID"
echo "  6. Click 'Save'"
echo "  7. Redeploy list-organizations-admin from the Edge Functions page"
echo ""
echo "Would you like to try setting the secret via CLI now? (y/n)"
read -r response

if [[ "$response" =~ ^[Yy]$ ]]; then
    echo ""
    echo "🔐 Attempting to set Supabase secret..."
    
    # Check if supabase CLI is available via npx (included as dev dependency)
    if npx supabase --version &> /dev/null; then
        echo "Setting SUPER_ADMIN_ORG_ID secret..."
        npx supabase secrets set SUPER_ADMIN_ORG_ID="$SUPER_ADMIN_ORG_ID"
        
        echo ""
        echo "📦 Redeploying edge functions..."
        cd supabase/functions
        npx supabase functions deploy list-organizations-admin
        cd ../..
        
        echo "✅ Supabase secrets configured and functions redeployed!"
    else
        echo "❌ Supabase CLI not found. Please install dependencies or use the dashboard method."
        echo "   Install: npm ci (Supabase CLI is included as dev dependency)"
        exit 1
    fi
else
    echo "⏭️  Skipping CLI setup. Please configure manually using the dashboard."
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "  1. Restart your dev server: npm run dev"
echo "  2. Log in as admin@equipqr.app"
echo "  3. Switch to Columbia Cloudworks organization"
echo "  4. Navigate to Billing Exemptions Admin page"
echo ""
echo "📚 For detailed documentation, see:"
echo "   - BILLING_EXEMPTIONS_SETUP.md"
echo "   - docs/deployment/edge-function-secrets.md"
echo ""

