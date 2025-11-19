import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  condition: null;
  required: boolean;
  notes: string;
  section: string;
}

function parseMarkdownFile(filePath: string): ChecklistItem[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const items: ChecklistItem[] = [];
  
  let currentSection = '';
  let itemIndex = 1;
  
  const lines = content.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Parse section headers (## 1. Section Name)
    if (line.startsWith('## ')) {
      const sectionMatch = line.match(/^## \d+\. (.+)$/);
      if (sectionMatch) {
        currentSection = sectionMatch[1];
      }
      continue;
    }
    
    // Parse item headers (### Item 1: Title)
    if (line.startsWith('### Item ')) {
      const itemMatch = line.match(/^### Item \d+: (.+)$/);
      if (itemMatch && currentSection) {
        const title = itemMatch[1];
        
        // Look for description on next line
        let description = '';
        if (i + 1 < lines.length && lines[i + 1].trim().startsWith('**Description:**')) {
          description = lines[i + 1].trim().replace(/^\*\*Description:\*\*\s*/, '');
        }
        
        // Generate ID from section and index
        const sectionId = currentSection.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        const id = `${sectionId}-${itemIndex}`;
        
        items.push({
          id,
          title,
          description,
          condition: null,
          required: true,
          notes: '',
          section: currentSection
        });
        
        itemIndex++;
      }
    }
  }
  
  return items;
}

function checklistToJsonb(items: ChecklistItem[]): string {
  const jsonString = JSON.stringify(items);
  return jsonString.replace(/'/g, "''");
}

const templates = [
  { name: 'Pull Trailer PM (Default)', file: 'pull-trailer-pm-checklist.md' },
  { name: 'Compressor PM (Default)', file: 'compressor-pm-checklist.md' },
  { name: 'Scissor Lift PM (Default)', file: 'scissor-lift-pm-checklist.md' },
  { name: 'Excavator PM (Default)', file: 'excavator-pm-checklist.md' },
  { name: 'Skid Steer PM (Default)', file: 'skid-steer-pm-checklist.md' }
];

const templatesDir = path.join(__dirname, '../docs/pm-templates');

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

for (const template of templates) {
  const filePath = path.join(templatesDir, template.file);
  if (!fs.existsSync(filePath)) {
    console.warn(`⚠️  File not found: ${filePath}`);
    continue;
  }
  
  const items = parseMarkdownFile(filePath);
  const jsonbData = checklistToJsonb(items);
  const itemCount = items.length;
  const sectionCount = new Set(items.map(item => item.section)).size;
  
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
}

sql += `END $$;`;

const outputPath = path.join(__dirname, 'pm-templates-migration.sql');
fs.writeFileSync(outputPath, sql, 'utf-8');
console.log(`✅ Generated migration SQL: ${outputPath}`);
console.log(`\nSQL length: ${sql.length} characters`);
console.log(`Preview (first 1000 chars):\n${sql.substring(0, 1000)}...`);

