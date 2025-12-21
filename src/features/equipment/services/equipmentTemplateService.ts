import { logger } from '@/utils/logger';
import { supabase } from '@/integrations/supabase/client';

export interface EquipmentTemplateAssignment {
  equipmentId: string;
  templateId: string | null;
}

export class EquipmentTemplateService {
  /**
   * Assign a PM template to a single equipment record
   */
  static async assignTemplateToEquipment(equipmentId: string, templateId: string): Promise<void> {
    const { error } = await supabase
      .from('equipment')
      .update({ default_pm_template_id: templateId })
      .eq('id', equipmentId);

    if (error) {
      throw new Error(`Failed to assign template: ${error.message}`);
    }
  }

  /**
   * Remove PM template from a single equipment record
   */
  static async removeTemplateFromEquipment(equipmentId: string): Promise<void> {
    const { error } = await supabase
      .from('equipment')
      .update({ default_pm_template_id: null })
      .eq('id', equipmentId);

    if (error) {
      throw new Error(`Failed to remove template: ${error.message}`);
    }
  }

  /**
   * Bulk assign a PM template to multiple equipment records
   */
  static async bulkAssignTemplate(equipmentIds: string[], templateId: string): Promise<{ successCount: number; errorCount: number }> {
    let successCount = 0;
    let errorCount = 0;

    for (const equipmentId of equipmentIds) {
      try {
        await this.assignTemplateToEquipment(equipmentId, templateId);
        successCount++;
      } catch (error) {
        logger.error(`Failed to assign template to equipment ${equipmentId}:`, error);
        errorCount++;
      }
    }

    return { successCount, errorCount };
  }

  /**
   * Bulk remove PM templates from multiple equipment records
   */
  static async bulkRemoveTemplates(equipmentIds: string[]): Promise<{ successCount: number; errorCount: number }> {
    let successCount = 0;
    let errorCount = 0;

    for (const equipmentId of equipmentIds) {
      try {
        await this.removeTemplateFromEquipment(equipmentId);
        successCount++;
      } catch (error) {
        logger.error(`Failed to remove template from equipment ${equipmentId}:`, error);
        errorCount++;
      }
    }

    return { successCount, errorCount };
  }

  /**
   * Change PM template for multiple equipment records
   */
  static async bulkChangeTemplate(equipmentIds: string[], newTemplateId: string): Promise<{ successCount: number; errorCount: number }> {
    return this.bulkAssignTemplate(equipmentIds, newTemplateId);
  }

  /**
   * Get equipment records with their assigned PM templates
   */
  static async getEquipmentWithTemplates(organizationId: string) {
    const { data, error } = await supabase
      .from('equipment')
      .select(`
        *,
        pm_template:pm_checklist_templates(id, name, description)
      `)
      .eq('organization_id', organizationId);

    if (error) {
      throw new Error(`Failed to fetch equipment with templates: ${error.message}`);
    }

    return data;
  }
}