#!/usr/bin/env node

/**
 * Supabase Migration Filename Fixer
 * 
 * This script validates and normalizes Supabase migration filenames to ensure they follow
 * the proper naming convention: YYYYMMDDHHMMSS_descriptive_name.sql
 * 
 * It checks for:
 * - Proper timestamp format (14 digits)
 * - Valid characters in descriptive names
 * - Missing or malformed migration files
 * 
 * Usage: node dev/supabase-fix-migrations.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MIGRATIONS_DIR = path.join(__dirname, '..', 'supabase', 'migrations');
const TIMESTAMP_REGEX = /^(\d{14})_(.+)\.sql$/;

function validateMigrationFilename(filename) {
  const match = filename.match(TIMESTAMP_REGEX);
  if (!match) {
    return {
      valid: false,
      error: `Invalid filename format. Expected: YYYYMMDDHHMMSS_description.sql, got: ${filename}`
    };
  }

  const [, timestamp, description] = match;
  
  // Validate timestamp format
  if (timestamp.length !== 14) {
    return {
      valid: false,
      error: `Invalid timestamp length. Expected 14 digits, got ${timestamp.length}: ${timestamp}`
    };
  }

  // Validate description
  if (!description || description.trim() === '') {
    return {
      valid: false,
      error: `Missing description in filename: ${filename}`
    };
  }

  // Check for invalid characters in description
  const validDescriptionRegex = /^[a-zA-Z0-9_-]+$/;
  if (!validDescriptionRegex.test(description)) {
    return {
      valid: false,
      error: `Invalid characters in description. Use only letters, numbers, hyphens, and underscores: ${description}`
    };
  }

  return { valid: true };
}

function fixMigrations() {
  console.log('🔍 Checking Supabase migration filenames...');
  
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    console.log('📁 Migrations directory does not exist yet. Creating it...');
    fs.mkdirSync(MIGRATIONS_DIR, { recursive: true });
    return;
  }

  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter(file => file.endsWith('.sql'))
    .sort();

  if (files.length === 0) {
    console.log('📭 No migration files found.');
    return;
  }

  console.log(`📋 Found ${files.length} migration files:`);
  
  let hasErrors = false;
  const results = [];

  for (const file of files) {
    const validation = validateMigrationFilename(file);
    results.push({ file, validation });
    
    if (validation.valid) {
      console.log(`✅ ${file}`);
    } else {
      console.log(`❌ ${file}`);
      console.log(`   Error: ${validation.error}`);
      hasErrors = true;
    }
  }

  if (hasErrors) {
    console.log('\n🚨 Migration filename issues detected!');
    console.log('\nTo fix these issues:');
    console.log('1. Rename files to follow the format: YYYYMMDDHHMMSS_description.sql');
    console.log('2. Ensure timestamps are exactly 14 digits');
    console.log('3. Use only letters, numbers, hyphens, and underscores in descriptions');
    console.log('4. Maintain chronological order of timestamps\n');
    
    console.log('Example valid filenames:');
    console.log('- 20250101000000_baseline_schema.sql');
    console.log('- 20250822120000_add_work_orders_table.sql');
    console.log('- 20250822130000_work_orders_rls_policies.sql');
    
    process.exit(1);
  } else {
    console.log('\n✅ All migration filenames are valid!');
    console.log('🎉 Migration files follow proper naming conventions.');
  }
}

// Check for duplicate timestamps
function checkDuplicateTimestamps() {
  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter(file => file.endsWith('.sql'));
  
  const timestamps = new Map();
  
  for (const file of files) {
    const match = file.match(TIMESTAMP_REGEX);
    if (match) {
      const timestamp = match[1];
      if (timestamps.has(timestamp)) {
        console.log(`⚠️  Warning: Duplicate timestamp detected:`);
        console.log(`   ${timestamps.get(timestamp)}`);
        console.log(`   ${file}`);
        console.log('   Consider updating one of these timestamps to maintain proper ordering.');
      } else {
        timestamps.set(timestamp, file);
      }
    }
  }
}

function main() {
  try {
    fixMigrations();
    checkDuplicateTimestamps();
  } catch (error) {
    console.error('❌ Error checking migrations:', error.message);
    process.exit(1);
  }
}

main();