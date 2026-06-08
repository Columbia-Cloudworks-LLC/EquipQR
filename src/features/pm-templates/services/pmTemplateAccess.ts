import { supabase } from '@/integrations/supabase/client';

const ACCESS_DENIED = 'PM template not found or access denied';

export async function assertPmTemplateAccessible(
  organizationId: string,
  templateId: string,
): Promise<{ id: string; organization_id: string | null }> {
  const { data: template, error: templateError } = await supabase
    .from('pm_checklist_templates')
    .select('id, organization_id')
    .eq('id', templateId)
    .single();

  if (templateError || !template) {
    throw new Error(ACCESS_DENIED);
  }

  if (template.organization_id !== null && template.organization_id !== organizationId) {
    throw new Error(ACCESS_DENIED);
  }

  return template;
}
