#!/usr/bin/env ts-node

import { createClient } from '@supabase/supabase-js';
import { defaultForkliftChecklist } from '../src/services/preventativeMaintenanceService';

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

async function seedForkliftTemplate() {
  try {
    // First, check if the global template already exists
    const { data: existingTemplate } = await supabase
      .from('pm_checklist_templates')
      .select('id')
      .eq('name', 'Forklift PM (Default)')
      .eq('organization_id', null)
      .single();

    if (existingTemplate) {
      console.log('✅ Global Forklift PM template already exists');
      return;
    }

    // Get or create a service user ID
    let serviceUserId: string;
    
    // Try to find an existing admin user
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);
    
    if (profiles && profiles.length > 0) {
      serviceUserId = profiles[0].id;
    } else {
      console.error('No user profiles found. Please create at least one user first.');
      process.exit(1);
    }

    // Sanitize the checklist data for template storage
    const sanitizedChecklist = defaultForkliftChecklist.map(item => ({
      ...item,
      condition: null,
      notes: ''
    }));

    // Insert the global template
    const { data, error } = await supabase
      .from('pm_checklist_templates')
      .insert({
        organization_id: null, // Global template
        name: 'Forklift PM (Default)',
        description: 'Protected, global starter checklist for forklifts. This template provides comprehensive preventive maintenance items covering all major systems.',
        is_protected: true,
        template_data: sanitizedChecklist,
        created_by: serviceUserId,
        updated_by: serviceUserId
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Error creating global Forklift PM template:', error);
      process.exit(1);
    }

    console.log('✅ Successfully created global Forklift PM template');
    console.log(`   Template ID: ${data.id}`);
    console.log(`   Items: ${sanitizedChecklist.length}`);
    console.log(`   Sections: ${Array.from(new Set(sanitizedChecklist.map(item => item.section))).length}`);
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  }
}

seedForkliftTemplate();