import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MIGRATIONS_DIR = path.join(__dirname, '..', 'supabase', 'migrations');

// All 79 migrations from production (main branch database)
const productionMigrations = [
  '20250103000000',
  '20250901235558',
  '20250902123800',
  '20250902124500',
  '20250903190521',
  '20251021',
  '20251024125429',
  '20251025063611',
  '20251025065141',
  '20251025235828',
  '20251027234258',
  '20251027234423',
  '20251027234430',
  '20251028012503',
  '20251028012532',
  '20251028012544',
  '20251028012959',
  '20251028015448',
  '20251028022133',
  '20251029193629',
  '20251029203659',
  '20251030012347',
  '20251030012550',
  '20251030013102',
  '20251030013110',
  '20251030013117',
  '20251030013128',
  '20251030013153',
  '20251030013214',
  '20251030013224',
  '20251030013237',
  '20251030013247',
  '20251030013327',
  '20251030013341',
  '20251030013405',
  '20251030013431',
  '20251030013528',
  '20251030013536',
  '20251030013544',
  '20251030013555',
  '20251030013619',
  '20251030013646',
  '20251030013721',
  '20251030013902',
  '20251030013923',
  '20251030013933',
  '20251030013942',
  '20251030014012',
  '20251030014854',
  '20251030014902',
  '20251030014907',
  '20251030014913',
  '20251030014918',
  '20251030014921',
  '20251030014932',
  '20251030014938',
  '20251030015248',
  '20251030015257',
  '20251030030121',
  '20251119232102',
  '20251119232213',
  '20251119232932',
  '20251119232945',
  '20251119233004',
  '20251119233052',
  '20251119233056',
  '20251119233116',
  '20251119233130',
  '20251119233202',
  '20251119233215',
  '20251119233231',
  '20251119233253',
  '20251119233511',
  '20251119233702',
  '20251119234026',
  '20251119234111',
  '20251119234234',
  '20251119234334'
];

const migrationNames = {
  '20250103000000': 'fix_function_search_path',
  '20250901235558': 'remote_schema',
  '20250902123800': 'performance_optimization',
  '20250902124500': 'complete_performance_fix',
  '20250903190521': 'fix_organization_members_security',
  '20251021': 'part_picker',
  '20251024125429': 'fix_invitation_update_policy',
  '20251025063611': 'fix_invitation_unauthenticated_access',
  '20251025065141': 'prevent_duplicate_org_names_on_invite',
  '20251025235828': 'test_work_order_images_query',
  '20251027234258': 'inspect_current_state',
  '20251027234423': 'rls_performance_indexes',
  '20251027234430': 'safe_unused_index_cleanup',
  '20251028012503': 'deprecate_billing',
  '20251028012532': 'fix_billing_view_security',
  '20251028012544': 'remove_entitlements_view',
  '20251028012959': 'add_storage_quota_enforcement',
  '20251028015448': 'add_multi_equipment_work_orders',
  '20251028022133': 'deprecate_existing_billing_tables',
  '20251029193629': 'check_pm_records_debug',
  '20251029203659': 'consolidate_pm_select_policy',
  '20251030012347': 'fix_pm_select_policy',
  '20251030012550': 'fix_pm_select_policy_correct',
  '20251030013102': 'check_pm_policies',
  '20251030013110': 'test_is_org_member_function',
  '20251030013117': 'check_pm_records',
  '20251030013128': 'test_rls_directly',
  '20251030013153': 'fix_pm_select_policy_final',
  '20251030013214': 'debug_pm_query_issue',
  '20251030013224': 'check_pm_constraints_and_fix',
  '20251030013237': 'cleanup_duplicate_pm_records',
  '20251030013247': 'test_pm_query_after_cleanup',
  '20251030013327': 'debug_rls_policy_issue',
  '20251030013341': 'check_pm_constraints_and_fix_final',
  '20251030013405': 'cleanup_duplicate_pm_records_final',
  '20251030013431': 'final_rls_policy_fix',
  '20251030013528': 'debug_406_error_root_cause',
  '20251030013536': 'check_unique_constraints',
  '20251030013544': 'test_rls_policy_directly',
  '20251030013555': 'disable_rls_temporarily',
  '20251030013619': 'disable_rls_temporarily_test',
  '20251030013646': 'disable_rls_temporarily_test',
  '20251030013721': 'investigate_406_root_cause',
  '20251030013902': 'debug_table_structure_fixed',
  '20251030013923': 'test_direct_query_fixed',
  '20251030013933': 'check_postgrest_config',
  '20251030013942': 'force_rls_disable',
  '20251030014012': 'check_current_policies',
  '20251030014854': 'check_pm_templates',
  '20251030014902': 'check_pm_for_work_order',
  '20251030014907': 'get_pm_templates',
  '20251030014913': 'get_work_order_pm_data',
  '20251030014918': 'list_pm_templates',
  '20251030014921': 'get_template_data',
  '20251030014932': 'get_all_templates',
  '20251030014938': 'check_work_order_details',
  '20251030015248': 'check_new_work_order_pm',
  '20251030015257': 'get_pm_templates_detailed',
  '20251030030121': 'add_equipment_working_hours_at_creation',
  '20251119232102': 'seed_global_pm_templates',
  '20251119232213': 'seed_global_pm_templates_from_markdown',
  '20251119232932': 'check_pm_templates_in_db',
  '20251119232945': 'verify_pm_templates_count',
  '20251119233004': 'list_all_pm_templates',
  '20251119233052': 'check_pm_templates_data',
  '20251119233056': 'check_pm_templates_rls_policies',
  '20251119233116': 'query_pm_templates_direct',
  '20251119233130': 'verify_and_insert_missing_templates',
  '20251119233202': 'force_insert_missing_pm_templates',
  '20251119233215': 'test_insert_compressor_template',
  '20251119233231': 'insert_missing_templates_with_upsert',
  '20251119233253': 'final_check_pm_templates',
  '20251119233511': 'insert_compressor_pm_template',
  '20251119233702': 'fix_compressor_template_data',
  '20251119234026': 'insert_scissor_lift_pm_template_fixed',
  '20251119234111': 'fix_compressor_template_description',
  '20251119234234': 'insert_excavator_pm_template',
  '20251119234334': 'insert_skid_steer_pm_template'
};

function fixMainBranchMigrations() {
  console.log('🔍 Checking main branch migrations against production...\n');
  
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    console.log('❌ Migrations directory does not exist!');
    process.exit(1);
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
  const missing = productionMigrations.filter(version => !localFiles.includes(version));

  if (missing.length === 0) {
    console.log('✅ All migrations are present locally!');
    return;
  }

  console.log(`❌ Found ${missing.length} missing migrations:\n`);
  
  let created = 0;
  missing.forEach(version => {
    const name = migrationNames[version] || 'unknown';
    const filename = `${version}_${name}.sql`;
    const filepath = path.join(MIGRATIONS_DIR, filename);
    
    if (fs.existsSync(filepath)) {
      console.log(`⚠️  ${filename} already exists (unexpected)`);
      return;
    }

    // Create placeholder migration
    const content = `-- Migration: ${name}
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
  console.log(`💡 Commit these files to fix the deployment error.`);
  
  if (created > 0) {
    process.exit(1); // Exit with error to indicate action needed
  }
}

fixMainBranchMigrations();

