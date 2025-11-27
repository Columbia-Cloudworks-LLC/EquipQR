import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MIGRATIONS_DIR = path.join(__dirname, '..', 'supabase', 'migrations');

// Production migrations from main branch database
const productionMigrations = [
  { version: '20250103000000', name: 'fix_function_search_path' },
  { version: '20250901235558', name: 'remote_schema' },
  { version: '20250902123800', name: 'performance_optimization' },
  { version: '20250902124500', name: 'complete_performance_fix' },
  { version: '20250903190521', name: 'fix_organization_members_security' },
  { version: '20251021', name: 'part_picker' },
  { version: '20251024125429', name: 'fix_invitation_update_policy' },
  { version: '20251025063611', name: 'fix_invitation_unauthenticated_access' },
  { version: '20251025065141', name: 'prevent_duplicate_org_names_on_invite' },
  { version: '20251025235828', name: 'test_work_order_images_query' },
  { version: '20251027234258', name: 'inspect_current_state' },
  { version: '20251027234423', name: 'rls_performance_indexes' },
  { version: '20251027234430', name: 'safe_unused_index_cleanup' },
  { version: '20251028012503', name: 'deprecate_billing' },
  { version: '20251028012532', name: 'fix_billing_view_security' },
  { version: '20251028012544', name: 'remove_entitlements_view' },
  { version: '20251028012959', name: 'add_storage_quota_enforcement' },
  { version: '20251028015448', name: 'add_multi_equipment_work_orders' },
  { version: '20251028022133', name: 'deprecate_existing_billing_tables' },
  { version: '20251029193629', name: 'check_pm_records_debug' },
  { version: '20251029203659', name: 'consolidate_pm_select_policy' },
  { version: '20251030012347', name: 'fix_pm_select_policy' },
  { version: '20251030012550', name: 'fix_pm_select_policy_correct' },
  { version: '20251030013102', name: 'check_pm_policies' },
  { version: '20251030013110', name: 'test_is_org_member_function' },
  { version: '20251030013117', name: 'check_pm_records' },
  { version: '20251030013128', name: 'test_rls_directly' },
  { version: '20251030013153', name: 'fix_pm_select_policy_final' },
  { version: '20251030013214', name: 'debug_pm_query_issue' },
  { version: '20251030013224', name: 'check_pm_constraints_and_fix' },
  { version: '20251030013237', name: 'cleanup_duplicate_pm_records' },
  { version: '20251030013247', name: 'test_pm_query_after_cleanup' },
  { version: '20251030013327', name: 'debug_rls_policy_issue' },
  { version: '20251030013341', name: 'check_pm_constraints_and_fix_final' },
  { version: '20251030013405', name: 'cleanup_duplicate_pm_records_final' },
  { version: '20251030013431', name: 'final_rls_policy_fix' },
  { version: '20251030013528', name: 'debug_406_error_root_cause' },
  { version: '20251030013536', name: 'check_unique_constraints' },
  { version: '20251030013544', name: 'test_rls_policy_directly' },
  { version: '20251030013555', name: 'disable_rls_temporarily' },
  { version: '20251030013619', name: 'disable_rls_temporarily_test' },
  { version: '20251030013646', name: 'disable_rls_temporarily_test' },
  { version: '20251030013721', name: 'investigate_406_root_cause' },
  { version: '20251030013902', name: 'debug_table_structure_fixed' },
  { version: '20251030013923', name: 'test_direct_query_fixed' },
  { version: '20251030013933', name: 'check_postgrest_config' },
  { version: '20251030013942', name: 'force_rls_disable' },
  { version: '20251030014012', name: 'check_current_policies' },
  { version: '20251030014854', name: 'check_pm_templates' },
  { version: '20251030014902', name: 'check_pm_for_work_order' },
  { version: '20251030014907', name: 'get_pm_templates' },
  { version: '20251030014913', name: 'get_work_order_pm_data' },
  { version: '20251030014918', name: 'list_pm_templates' },
  { version: '20251030014921', name: 'get_template_data' },
  { version: '20251030014932', name: 'get_all_templates' },
  { version: '20251030014938', name: 'check_work_order_details' },
  { version: '20251030015248', name: 'check_new_work_order_pm' },
  { version: '20251030015257', name: 'get_pm_templates_detailed' },
  { version: '20251030030121', name: 'add_equipment_working_hours_at_creation' },
  { version: '20251119232102', name: 'seed_global_pm_templates' },
  { version: '20251119232213', name: 'seed_global_pm_templates_from_markdown' },
  { version: '20251119232932', name: 'check_pm_templates_in_db' },
  { version: '20251119232945', name: 'verify_pm_templates_count' },
  { version: '20251119233004', name: 'list_all_pm_templates' },
  { version: '20251119233052', name: 'check_pm_templates_data' },
  { version: '20251119233056', name: 'check_pm_templates_rls_policies' },
  { version: '20251119233116', name: 'query_pm_templates_direct' },
  { version: '20251119233130', name: 'verify_and_insert_missing_templates' },
  { version: '20251119233202', name: 'force_insert_missing_pm_templates' },
  { version: '20251119233215', name: 'test_insert_compressor_template' },
  { version: '20251119233231', name: 'insert_missing_templates_with_upsert' },
  { version: '20251119233253', name: 'final_check_pm_templates' },
  { version: '20251119233511', name: 'insert_compressor_pm_template' },
  { version: '20251119233702', name: 'fix_compressor_template_data' },
  { version: '20251119234026', name: 'insert_scissor_lift_pm_template_fixed' },
  { version: '20251119234111', name: 'fix_compressor_template_description' },
  { version: '20251119234234', name: 'insert_excavator_pm_template' },
  { version: '20251119234334', name: 'insert_skid_steer_pm_template' }
];

function checkAndCreateMissing() {
  console.log('🔍 Checking for missing migration files on main branch...\n');
  
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    console.log('❌ Migrations directory does not exist!');
    return;
  }

  // Get local migration files
  const localFiles = fs.readdirSync(MIGRATIONS_DIR)
    .filter(file => file.endsWith('.sql'))
    .map(file => {
      const match = file.match(/^(\d+)_/);
      return match ? match[1] : null;
    })
    .filter(Boolean);

  console.log(`📊 Production migrations: ${productionMigrations.length}`);
  console.log(`📊 Local migrations: ${localFiles.length}\n`);

  // Find missing migrations
  const missing = productionMigrations.filter(m => !localFiles.includes(m.version));

  if (missing.length === 0) {
    console.log('✅ All migrations are present locally!');
    return;
  }

  console.log(`❌ Found ${missing.length} missing migrations:\n`);
  
  let created = 0;
  missing.forEach(m => {
    const filename = `${m.version}_${m.name}.sql`;
    const filepath = path.join(MIGRATIONS_DIR, filename);
    
    // Check if file already exists (might be a different name)
    if (fs.existsSync(filepath)) {
      console.log(`⚠️  ${filename} already exists`);
      return;
    }

    // Create placeholder migration
    const content = `-- Migration: ${m.name}
-- This migration was already applied to production
-- This is a placeholder file to sync local migrations with remote database
-- DO NOT modify this file - it exists only to match production state

BEGIN;
-- Migration already applied - no-op
COMMIT;
`;

    fs.writeFileSync(filepath, content, 'utf8');
    console.log(`✅ Created: ${filename}`);
    created++;
  });

  console.log(`\n📝 Created ${created} placeholder migration files.`);
  console.log(`💡 These files ensure local migrations match the remote database state.`);
}

checkAndCreateMissing();

