-- Create global Forklift PM template from existing checklist data
WITH checklist_source AS (
  SELECT checklist_data FROM preventative_maintenance 
  WHERE id = '118ffd73-35b9-41bd-b160-a95d56c902fb'
),
sanitized_data AS (
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', item->>'id',
      'section', item->>'section', 
      'title', item->>'title',
      'description', item->>'description',
      'required', (item->>'required')::boolean,
      'condition', null,
      'notes', ''
    )
  ) as clean_checklist
  FROM checklist_source, jsonb_array_elements(checklist_data) as item
),
service_user AS (
  SELECT id FROM profiles LIMIT 1
)
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
  null,
  'Forklift PM (Default)',
  'Comprehensive preventive maintenance checklist for forklifts. This template provides detailed inspection items covering all major systems.',
  true,
  sd.clean_checklist,
  su.id,
  su.id
FROM sanitized_data sd, service_user su
WHERE NOT EXISTS (
  SELECT 1 FROM pm_checklist_templates 
  WHERE organization_id IS NULL 
  AND name = 'Forklift PM (Default)'
);