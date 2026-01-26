#!/usr/bin/env node
/**
 * Generate VAPID keys for Web Push notifications
 * 
 * Run: npm run generate:vapid-keys
 * Or: node scripts/generate-vapid-keys.mjs
 * 
 * Output will include:
 * - Public Key: Add to VITE_VAPID_PUBLIC_KEY in .env and VAPID_PUBLIC_KEY in Supabase secrets
 * - Private Key: Add to VAPID_PRIVATE_KEY in Supabase secrets (KEEP SECRET!)
 */

import { spawn } from 'child_process';

console.log('Generating VAPID keys for Web Push notifications...\n');

// Use npx to run web-push generate-vapid-keys
const proc = spawn('npx', ['web-push', 'generate-vapid-keys', '--json'], {
  stdio: ['inherit', 'pipe', 'inherit'],
  shell: true
});

let output = '';

proc.stdout.on('data', (data) => {
  output += data.toString();
});

proc.on('close', (code) => {
  if (code !== 0) {
    console.error('Failed to generate VAPID keys. Make sure web-push is available:');
    console.error('  npm install --save-dev web-push');
    process.exit(1);
  }

  try {
    const keys = JSON.parse(output);
    
    console.log('='.repeat(70));
    console.log('VAPID Keys Generated Successfully');
    console.log('='.repeat(70));
    console.log();
    console.log('Add these to your environment:');
    console.log();
    console.log('1. Local development (.env):');
    console.log('   VITE_VAPID_PUBLIC_KEY=' + keys.publicKey);
    console.log();
    console.log('2. Supabase Edge Function secrets (Dashboard > Settings > Edge Functions > Secrets):');
    console.log('   VAPID_PUBLIC_KEY=' + keys.publicKey);
    console.log('   VAPID_PRIVATE_KEY=' + keys.privateKey);
    console.log('   VAPID_SUBJECT=mailto:support@equipqr.app');
    console.log();
    console.log('IMPORTANT: Keep VAPID_PRIVATE_KEY secret! Never expose it to clients.');
    console.log('='.repeat(70));
  } catch (e) {
    // Fallback if JSON parsing fails - output might not be JSON
    console.log(output);
    console.log();
    console.log('Copy the keys above and add them to your environment:');
    console.log('- Public Key  → VITE_VAPID_PUBLIC_KEY, VAPID_PUBLIC_KEY');
    console.log('- Private Key → VAPID_PRIVATE_KEY (Supabase secrets only)');
  }
});
