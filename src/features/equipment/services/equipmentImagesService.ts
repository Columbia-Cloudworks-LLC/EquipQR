import { logger } from '@/utils/logger';
import { supabase } from '@/integrations/supabase/client';
import { getEquipmentImages } from './equipmentNotesService';
import { getWorkOrderImages } from '@/features/work-orders/services/workOrderNotesService';

export interface EquipmentImageData {
  id: string;
  file_name: string;
  file_url: string;
  file_size?: number;
  description?: string;
  created_at: string;
  uploaded_by_name?: string;
  uploaded_by: string;
  note_content?: string;
  note_author_name?: string;
  is_private_note?: boolean;
  source_type: 'equipment_note' | 'work_order_note';
  source_id?: string; // note_id or work_order_id
}

// Get all images for equipment from both equipment notes and work order notes
export const getAllEquipmentImages = async (
  equipmentId: string,
  organizationId: string,
  userRole: string,
  _userTeamIds?: string[]
): Promise<EquipmentImageData[]> => {
  void _userTeamIds;
  try {
    // Get equipment note images
    const equipmentImages = await getEquipmentImages(equipmentId);
    
    // Get work order images for this equipment
    const { data: workOrders } = await supabase
      .from('work_orders')
      .select('id')
      .eq('equipment_id', equipmentId)
      .eq('organization_id', organizationId);

    const workOrderImages: EquipmentImageData[] = [];
    if (workOrders && workOrders.length > 0) {
      for (const wo of workOrders) {
        const images = await getWorkOrderImages(wo.id);
        workOrderImages.push(
          ...images.map((img) => ({
            ...(img as unknown as Omit<EquipmentImageData, 'source_type' | 'source_id'>),
            source_type: 'work_order_note' as const,
            source_id: wo.id
          }))
        );
      }
    }

    // Combine and format all images
    const equipmentNotesImages: EquipmentImageData[] = equipmentImages.map(img => ({
      ...img,
      source_type: 'equipment_note' as const,
      source_id: ('equipment_note_id' in img ? (img as { equipment_note_id: string }).equipment_note_id : undefined)
    }));

    const allImages: EquipmentImageData[] = [
      ...equipmentNotesImages,
      ...workOrderImages.map(img => ({
        ...img,
        source_type: 'work_order_note' as const
      }))
    ];

    // Filter images based on user permissions
    const filteredImages = allImages.filter(image => {
      // If it's a private note, check permissions
      if (image.is_private_note) {
        // Admins and owners can see all images
        if (['owner', 'admin'].includes(userRole)) {
          return true;
        }
        
        // Team managers can see images from their teams
        // Note: This would need additional logic to check if the note's author is in the user's teams
        // For now, we'll include all for team managers
        if (userRole === 'manager') {
          return true;
        }
        
        // Users can only see their own private images
        return false; // We'd need to check if uploaded_by === current_user_id
      }
      
      // Public images are visible to everyone
      return true;
    });

    // Sort by creation date (newest first)
    return filteredImages.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

  } catch (error) {
    logger.error('Error fetching equipment images:', error);
    return [];
  }
};

// Delete an equipment image (delegates to appropriate service)
export const deleteEquipmentImage = async (
  imageId: string, 
  sourceType: 'equipment_note' | 'work_order_note'
): Promise<void> => {
  if (sourceType === 'equipment_note') {
    const { deleteEquipmentNoteImage } = await import('./equipmentNotesService');
    return deleteEquipmentNoteImage(imageId);
  } else {
    const { deleteWorkOrderImage } = await import('@/features/work-orders/services/workOrderNotesService');
    return deleteWorkOrderImage(imageId);
  }
};

// Update equipment display image
export const updateEquipmentDisplayImage = async (
  equipmentId: string, 
  imageUrl: string
): Promise<void> => {
  const { updateEquipmentDisplayImage } = await import('./equipmentNotesService');
  return updateEquipmentDisplayImage(equipmentId, imageUrl);
};
