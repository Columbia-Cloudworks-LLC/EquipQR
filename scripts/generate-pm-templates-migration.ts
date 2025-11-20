import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read the service file and extract constants using a simple approach
// We'll use the seed scripts to get the data structure, then generate SQL

// Since importing causes issues, let's use the seed scripts pattern
// and generate SQL that can be applied via MCP

const templates = [
  {
    name: 'Pull Trailer PM (Default)',
    description: 'Protected, global starter checklist for pull trailers. This template provides comprehensive preventive maintenance items covering all major systems.',
    seedFile: 'seedPullTrailerTemplate.ts'
  },
  {
    name: 'Compressor PM (Default)',
    description: 'Protected, global starter checklist for compressors. This template provides comprehensive preventive maintenance items covering all major systems.',
    seedFile: 'seedCompressorTemplate.ts'
  },
  {
    name: 'Scissor Lift PM (Default)',
    description: 'Protected, global starter checklist for scissor lifts. This template provides comprehensive preventive maintenance items covering all major systems.',
    seedFile: 'seedScissorLiftTemplate.ts'
  },
  {
    name: 'Excavator PM (Default)',
    description: 'Protected, global starter checklist for excavators. This template provides comprehensive preventive maintenance items covering all major systems.',
    seedFile: 'seedExcavatorTemplate.ts'
  },
  {
    name: 'Skid Steer PM (Default)',
    description: 'Protected, global starter checklist for skid steers. This template provides comprehensive preventive maintenance items covering all major systems.',
    seedFile: 'seedSkidSteerTemplate.ts'
  }
];

// Instead of trying to import, let's use the Supabase client approach
// but generate SQL that uses a function to fetch and insert

// Actually, the best approach: Use a Node script with tsx that imports
// the constants in a way that works, or use the Supabase JS SDK directly
// But since user wants MCP, let's create SQL that can call a function

// Let me create SQL that uses the existing seed script logic but as SQL
// We'll need to manually construct the JSONB from the constants

// For now, let's create a SQL template that can be filled in
// The user can run the seed scripts, or we can use a different approach

console.log('This script will be replaced with a direct Supabase MCP approach');
console.log('Using seed scripts via Supabase client instead...');

// Actually, let me use the Supabase JS SDK directly in this script
// and then we can convert the approach to use MCP apply_migration

// We don't need Supabase client for SQL generation

// Now let's read the service file as text and extract the JSON
// Or better: use dynamic import with proper environment setup

async function generateSQLFromConstants() {
  // Mock Vite environment before import
  if (typeof globalThis.import === 'undefined') {
    (globalThis as any).import = { meta: { env: { DEV: true, MODE: 'development' } } };
  }
  
  // Set up a minimal environment for the import
  process.env.NODE_ENV = 'development';
  
  // Mock import.meta.env for the logger
  const originalImportMeta = (globalThis as any).import?.meta;
  if (!originalImportMeta?.env) {
    (globalThis as any).import = {
      meta: {
        env: {
          DEV: true,
          MODE: 'development',
          PROD: false
        }
      }
    };
  }
  
  // Use dynamic import with a workaround
  const serviceModule = await import('../src/services/preventativeMaintenanceService.js');
  
  const checklists = [
    { name: 'Pull Trailer PM (Default)', data: serviceModule.defaultPullTrailerChecklist },
    { name: 'Compressor PM (Default)', data: serviceModule.defaultCompressorChecklist },
    { name: 'Scissor Lift PM (Default)', data: serviceModule.defaultScissorLiftChecklist },
    { name: 'Excavator PM (Default)', data: serviceModule.defaultExcavatorChecklist },
    { name: 'Skid Steer PM (Default)', data: serviceModule.defaultSkidSteerChecklist }
  ];

  // Sanitize and convert to SQL
  function sanitizeChecklist(items: any[]) {
    return items.map(item => ({
      ...item,
      condition: null,
      notes: ''
    }));
  }

  function checklistToJsonb(items: any[]): string {
    const sanitized = sanitizeChecklist(items);
    return JSON.stringify(sanitized).replace(/'/g, "''");
  }

  let sql = `-- Migration: Seed global PM checklist templates
-- This migration inserts 5 new global PM templates into pm_checklist_templates

DO $$
DECLARE
    service_user_id UUID;
BEGIN
    -- Get the first available user profile
    SELECT id INTO service_user_id
    FROM profiles
    LIMIT 1;
    
    IF service_user_id IS NULL THEN
        RAISE EXCEPTION 'No user profiles found. Please create at least one user first.';
    END IF;

`;

  checklists.forEach((template) => {
    const jsonbData = checklistToJsonb(template.data);
    const itemCount = template.data.length;
    const sectionCount = new Set(template.data.map((item: any) => item.section)).size;
    
    sql += `
    -- Insert ${template.name}
    INSERT INTO pm_checklist_templates (
        organization_id,
        name,
        description,
        is_protected,
        template_data,
        created_by,
        updated_by
    )
    SELECT
        NULL, -- Global template
        '${template.name.replace(/'/g, "''")}',
        'Protected, global starter checklist. This template provides comprehensive preventive maintenance items covering all major systems.',
        true,
        '${jsonbData}'::jsonb,
        service_user_id,
        service_user_id
    WHERE NOT EXISTS (
        SELECT 1 FROM pm_checklist_templates
        WHERE name = '${template.name.replace(/'/g, "''")}'
        AND organization_id IS NULL
    );
    -- ${itemCount} items, ${sectionCount} sections

`;
  });

  sql += `END $$;`;

  return sql;
}

// Execute
generateSQLFromConstants()
  .then(sql => {
    const outputPath = path.join(__dirname, 'pm-templates-migration.sql');
    fs.writeFileSync(outputPath, sql, 'utf-8');
    console.log(`✅ Generated migration SQL: ${outputPath}`);
    console.log(`\nSQL Preview (first 500 chars):\n${sql.substring(0, 500)}...`);
    return sql;
  })
  .catch(error => {
    console.error('❌ Error generating SQL:', error);
    process.exit(1);
  });
