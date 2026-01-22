#!/usr/bin/env node

/**
 * Configure Supabase Auth Settings via Management API
 * 
 * This script configures the Site URL and Redirect URIs for a Supabase project
 * to ensure OAuth redirects go to the correct domain (e.g., preview.equipqr.app
 * instead of per-commit Vercel URLs).
 * 
 * Usage:
 *   node scripts/configure-supabase-auth.mjs --environment preview
 *   node scripts/configure-supabase-auth.mjs --environment production
 * 
 * Environment Variables:
 *   SUPABASE_ACCESS_TOKEN - Required. Personal access token for Supabase Management API.
 *                           Obtain from: Supabase Dashboard → Account → Access Tokens
 * 
 * @see https://supabase.com/docs/reference/api/introduction
 * @see https://github.com/Columbia-Cloudworks-LLC/EquipQR/issues/512
 */

import { parseArgs } from 'node:util';

// Configuration for each environment
const ENVIRONMENTS = {
  preview: {
    projectId: 'olsdirkvvfegvclbpgrg',
    siteUrl: 'https://preview.equipqr.app',
    redirectUris: [
      'https://preview.equipqr.app/**',
      // Include localhost for local development testing against preview backend
      'http://localhost:5173/**',
      'http://localhost:8080/**',
      'http://127.0.0.1:5173/**',
      'http://127.0.0.1:8080/**'
    ]
  },
  production: {
    projectId: 'ymxkzronkhwxzcdcbnwq',
    siteUrl: 'https://equipqr.app',
    redirectUris: [
      'https://equipqr.app/**',
      // Include localhost for local development testing against production backend
      'http://localhost:5173/**',
      'http://localhost:8080/**',
      'http://127.0.0.1:5173/**',
      'http://127.0.0.1:8080/**'
    ]
  }
};

const SUPABASE_API_BASE = 'https://api.supabase.com';

/**
 * Get current auth configuration for a project
 */
async function getAuthConfig(projectId, accessToken) {
  const response = await fetch(
    `${SUPABASE_API_BASE}/v1/projects/${projectId}/config/auth`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to get auth config: ${response.status} ${response.statusText}\n${errorText}`);
  }

  return response.json();
}

/**
 * Update auth configuration for a project
 */
async function updateAuthConfig(projectId, accessToken, config) {
  const response = await fetch(
    `${SUPABASE_API_BASE}/v1/projects/${projectId}/config/auth`,
    {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(config)
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to update auth config: ${response.status} ${response.statusText}\n${errorText}`);
  }

  return response.json();
}

/**
 * Main function
 */
async function main() {
  // Parse command line arguments
  const { values } = parseArgs({
    options: {
      environment: {
        type: 'string',
        short: 'e',
        default: 'preview'
      },
      'dry-run': {
        type: 'boolean',
        short: 'd',
        default: false
      }
    }
  });

  const environment = values.environment;
  const dryRun = values['dry-run'];

  // Validate environment
  if (!ENVIRONMENTS[environment]) {
    console.error(`❌ Invalid environment: ${environment}`);
    console.error(`   Valid environments: ${Object.keys(ENVIRONMENTS).join(', ')}`);
    process.exit(1);
  }

  // Check for access token
  const accessToken = process.env.SUPABASE_ACCESS_TOKEN;
  if (!accessToken) {
    console.error('❌ Missing SUPABASE_ACCESS_TOKEN environment variable');
    console.error('   Obtain from: Supabase Dashboard → Account → Access Tokens');
    process.exit(1);
  }

  const envConfig = ENVIRONMENTS[environment];
  console.log(`🔧 Configuring Supabase Auth for ${environment} environment`);
  console.log(`   Project ID: ${envConfig.projectId}`);
  console.log(`   Site URL: ${envConfig.siteUrl}`);
  console.log(`   Redirect URIs: ${envConfig.redirectUris.length} entries`);

  if (dryRun) {
    console.log('\n🔍 DRY RUN - No changes will be made\n');
  }

  try {
    // Get current configuration
    console.log('\n📥 Fetching current auth configuration...');
    const currentConfig = await getAuthConfig(envConfig.projectId, accessToken);
    
    console.log(`   Current Site URL: ${currentConfig.site_url || '(not set)'}`);
    const rawUris = currentConfig.uri_allow_list;
    const currentUris = Array.isArray(rawUris)
      ? [...rawUris]
      : rawUris != null && typeof rawUris === 'object' && 'length' in rawUris
        ? Array.from(rawUris)
        : [];
    console.log(`   Current Redirect URIs: ${currentUris.length} entries`);

    // Check if update is needed
    const siteUrlNeedsUpdate = currentConfig.site_url !== envConfig.siteUrl;
    const urisNeedUpdate =
      JSON.stringify([...currentUris].sort()) !== JSON.stringify([...envConfig.redirectUris].sort());

    if (!siteUrlNeedsUpdate && !urisNeedUpdate) {
      console.log('\n✅ Auth configuration is already correct. No changes needed.');
      return;
    }

    // Prepare update payload
    const updatePayload = {};
    
    if (siteUrlNeedsUpdate) {
      updatePayload.site_url = envConfig.siteUrl;
      console.log(`\n📝 Will update Site URL: ${currentConfig.site_url} → ${envConfig.siteUrl}`);
    }

    if (urisNeedUpdate) {
      updatePayload.uri_allow_list = envConfig.redirectUris;
      console.log(`\n📝 Will update Redirect URIs:`);
      console.log('   Current:');
      currentUris.forEach(uri => console.log(`     - ${uri}`));
      console.log('   New:');
      envConfig.redirectUris.forEach(uri => console.log(`     - ${uri}`));
    }

    if (dryRun) {
      console.log('\n🔍 DRY RUN - Would have applied the above changes');
      console.log('   Run without --dry-run to apply changes');
      return;
    }

    // Apply update
    console.log('\n📤 Updating auth configuration...');
    const updatedConfig = await updateAuthConfig(envConfig.projectId, accessToken, updatePayload);

    console.log('\n✅ Auth configuration updated successfully!');
    console.log(`   Site URL: ${updatedConfig.site_url}`);
    console.log(`   Redirect URIs: ${updatedConfig.uri_allow_list?.length || 0} entries`);

  } catch (error) {
    console.error(`\n❌ Error: ${error.message}`);
    process.exit(1);
  }
}

main();
