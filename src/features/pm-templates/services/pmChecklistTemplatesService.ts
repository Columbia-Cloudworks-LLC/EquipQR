import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';
import { PMChecklistItem } from './preventativeMaintenanceService';
import { nanoid } from 'nanoid';
import { safeJsonParse } from '@/lib/safeJsonParse';
import { requireAuthUserIdFromClaims } from '@/lib/authClaims';

type PMTemplateInsert = Database['public']['Tables']['pm_checklist_templates']['Insert'];
type PMTemplateUpdate = Database['public']['Tables']['pm_checklist_templates']['Update'];

export type PMTemplate = {
  id: string;
  organization_id: string | null;
  name: string;
  description: string | null;
  is_protected: boolean;
  template_data: PMChecklistItem[];
  interval_value: number | null;
  interval_type: 'days' | 'hours' | null;
  created_by: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

export interface PMTemplateSummary {
  id: string;
  name: string;
  description?: string | null;
  is_protected: boolean;
  organization_id: string | null;
  interval_value: number | null;
  interval_type: 'days' | 'hours' | null;
  sections: { name: string; count: number }[];
  itemCount: number;
}

export type TemplateItem = PMChecklistItem; // same shape as runtime, but condition always null in storage

// Helper function to generate sections summary from template data
export const generateSectionsSummary = (templateData: PMChecklistItem[]): { name: string; count: number }[] => {
  const sectionCounts = templateData.reduce((acc, item) => {
    acc[item.section] = (acc[item.section] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return Object.entries(sectionCounts).map(([name, count]) => ({ name, count }));
};

// Helper function to convert template to summary
export const templateToSummary = (template: PMTemplate): PMTemplateSummary => {
  // Safely handle JSON type conversion with proper type checking
  let templateData: PMChecklistItem[] = [];
  
  // Handle different possible formats of template_data from Supabase
  if (Array.isArray(template.template_data)) {
    templateData = template.template_data as PMChecklistItem[];
  } else if (typeof template.template_data === 'string') {
    // If it's a JSON string, parse it safely
    const parsed = safeJsonParse(
      template.template_data,
      [],
      { context: `template: ${template.id}` }
    );
    if (Array.isArray(parsed)) {
      templateData = parsed as PMChecklistItem[];
    }
  } else if (template.template_data && typeof template.template_data === 'object') {
    // If it's already an object but not an array, it might be a single item or malformed
    templateData = [];
  }
  
  return {
    id: template.id,
    name: template.name,
    description: template.description,
    is_protected: template.is_protected,
    organization_id: template.organization_id,
    interval_value: template.interval_value ?? null,
    interval_type: (template.interval_type as 'days' | 'hours' | null) ?? null,
    sections: generateSectionsSummary(templateData),
    itemCount: templateData.length
  };
};

export const pmChecklistTemplatesService = {
  // List all templates accessible to an organization (global + org-specific)
  async listTemplates(orgId: string): Promise<PMTemplate[]> {
    const { data, error } = await supabase
      .from('pm_checklist_templates')
      .select('*')
      .or(`organization_id.is.null,organization_id.eq.${orgId}`)
      .order('organization_id', { nullsFirst: true })
      .order('name');

    if (error) throw error;
    return (data || []) as unknown as PMTemplate[];
  },

  // Get a specific template by ID
  async getTemplate(id: string): Promise<PMTemplate | null> {
    const { data, error } = await supabase
      .from('pm_checklist_templates')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // No rows returned
      throw error;
    }
    return data as unknown as PMTemplate;
  },

  async createTemplate(templateData: {
    organizationId: string;
    name: string;
    description?: string;
    template_data: PMChecklistItem[];
    interval_value?: number | null;
    interval_type?: 'days' | 'hours' | null;
    created_by: string;
  }): Promise<PMTemplate> {
    const sanitizedData = templateData.template_data.map(item => ({
      ...item,
      id: nanoid(),
      condition: null,
      notes: ''
    }));

    const insertData: PMTemplateInsert = {
      organization_id: templateData.organizationId,
      name: templateData.name,
      description: templateData.description,
      template_data: sanitizedData,
      interval_value: templateData.interval_value ?? null,
      interval_type: templateData.interval_type ?? null,
      created_by: templateData.created_by,
      updated_by: templateData.created_by
    };

    const { data, error } = await supabase
      .from('pm_checklist_templates')
      .insert(insertData)
      .select()
      .single();

    if (error) throw error;
    return data as unknown as PMTemplate;
  },

  async updateTemplate(id: string, updates: {
    name?: string;
    description?: string;
    template_data?: PMChecklistItem[];
    interval_value?: number | null;
    interval_type?: 'days' | 'hours' | null;
    updated_by: string;
  }): Promise<PMTemplate> {
    const updateData: PMTemplateUpdate = {
      updated_by: updates.updated_by
    };

    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.interval_value !== undefined) updateData.interval_value = updates.interval_value;
    if (updates.interval_type !== undefined) updateData.interval_type = updates.interval_type;
    if (updates.template_data !== undefined) {
      updateData.template_data = updates.template_data.map(item => ({
        ...item,
        condition: null,
        notes: ''
      }));
    }

    const { data, error } = await supabase
      .from('pm_checklist_templates')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as unknown as PMTemplate;
  },

  // Delete a template (will fail for protected templates via RLS)
  async deleteTemplate(id: string): Promise<void> {
    const { error } = await supabase
      .from('pm_checklist_templates')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  // Clone a template to a different organization with new name
  async cloneTemplate(sourceId: string, targetOrgId: string, newName?: string): Promise<PMTemplate> {
    const userId = await requireAuthUserIdFromClaims();

    // First, get the source template
    const sourceTemplate = await this.getTemplate(sourceId);
    if (!sourceTemplate) {
      throw new Error('Source template not found');
    }

    // Clone and sanitize the template data with fresh IDs
    const templateData = Array.isArray(sourceTemplate.template_data) 
      ? sourceTemplate.template_data as unknown as PMChecklistItem[] 
      : [];
    
    const clonedData = templateData.map(item => ({
      ...item,
      id: nanoid(), // Generate fresh IDs to prevent conflicts
      condition: null,
      notes: ''
    }));

    const cloneName = newName || `${sourceTemplate.name} (Copy)`;

    const insertData: PMTemplateInsert = {
      organization_id: targetOrgId,
      name: cloneName,
      description: sourceTemplate.description || null,
      template_data: clonedData,
      is_protected: false, // Cloned templates are never protected
      created_by: userId,
      updated_by: userId
    };

    const { data, error } = await supabase
      .from('pm_checklist_templates')
      .insert(insertData)
      .select()
      .single();

    if (error) throw error;
    return data as unknown as PMTemplate;
  }
};
