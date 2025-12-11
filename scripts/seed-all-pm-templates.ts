#!/usr/bin/env ts-node

import { createClient } from '@supabase/supabase-js';
import {
  defaultPullTrailerChecklist,
  defaultCompressorChecklist,
  defaultScissorLiftChecklist,
  defaultExcavatorChecklist,
  defaultSkidSteerChecklist
} from '../src/services/preventativeMaintenanceService';

const DEFAULT_SUPABASE_URL = "https://ymxkzronkhwxzcdcbnwq.supabase.co";
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Validate URL format
if (!SUPABASE_URL.startsWith('https://') || !SUPABASE_URL.includes('.supabase.co')) {
  console.error('❌ Invalid Supabase URL format. Expected: https://<project-ref>.supabase.co');
  console.error(`   Received: ${SUPABASE_URL}`);
  process.exit(1);
}

// Warn if using default production URL
if (SUPABASE_URL === DEFAULT_SUPABASE_URL && !process.env.SUPABASE_URL && !process.env.VITE_SUPABASE_URL) {
  console.warn('⚠️  Using default production Supabase URL. To use a different project, set SUPABASE_URL or VITE_SUPABASE_URL environment variable.');
}

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  console.error('   Set it via: export SUPABASE_SERVICE_ROLE_KEY=your_key');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const templates = [
  {
    name: 'Pull Trailer PM',
    description: 'Protected, global starter checklist for pull trailers. This template provides comprehensive preventive maintenance items covering all major systems.',
    checklist: defaultPullTrailerChecklist
  },
  {
    name: 'Compressor PM',
    description: 'Protected, global starter checklist for compressors. This template provides comprehensive preventive maintenance items covering all major systems.',
    checklist: defaultCompressorChecklist
  },
  {
    name: 'Scissor Lift PM',
    description: 'Protected, global starter checklist for scissor lifts. This template provides comprehensive preventive maintenance items covering all major systems.',
    checklist: defaultScissorLiftChecklist
  },
  {
    name: 'Excavator PM',
    description: 'Protected, global starter checklist for excavators. This template provides comprehensive preventive maintenance items covering all major systems.',
    checklist: defaultExcavatorChecklist
  },
  {
    name: 'Skid Steer PM',
    description: 'Protected, global starter checklist for skid steers. This template provides comprehensive preventive maintenance items covering all major systems.',
    checklist: defaultSkidSteerChecklist
  }
];

async function seedAllTemplates() {
  try {
    // Get the first available user profile
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);
    
    if (!profiles || profiles.length === 0) {
      console.error('No user profiles found. Please create at least one user first.');
      process.exit(1);
    }

    const serviceUserId = profiles[0].id;

    for (const template of templates) {
      // Check if template already exists
      const { data: existingTemplate } = await supabase
        .from('pm_checklist_templates')
        .select('id')
        .eq('name', template.name)
        .eq('organization_id', null)
        .single();

      if (existingTemplate) {
        console.log(`✅ ${template.name} already exists`);
        continue;
      }

      // Sanitize the checklist data for template storage
      const sanitizedChecklist = template.checklist.map(item => ({
        ...item,
        condition: null,
        notes: ''
      }));

      // Insert the global template
      const { data, error } = await supabase
        .from('pm_checklist_templates')
        .insert({
          organization_id: null, // Global template
          name: template.name,
          description: template.description,
          is_protected: true,
          template_data: sanitizedChecklist,
          created_by: serviceUserId,
          updated_by: serviceUserId
        })
        .select()
        .single();

      if (error) {
        console.error(`❌ Error creating ${template.name}:`, error);
        continue;
      }

      const itemCount = sanitizedChecklist.length;
      const sectionCount = new Set(sanitizedChecklist.map(item => item.section)).size;
      console.log(`✅ Successfully created ${template.name}`);
      console.log(`   Template ID: ${data.id}`);
      console.log(`   Items: ${itemCount}, Sections: ${sectionCount}`);
    }
    
    console.log('\n✅ All templates processed!');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  }
}

seedAllTemplates();

