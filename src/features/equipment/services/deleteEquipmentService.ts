import { logger } from '@/utils/logger';
import { supabase } from '@/integrations/supabase/client';
import { deleteWorkOrder } from '@/features/work-orders/services/deleteWorkOrderService';

export interface EquipmentDeletionImpact {
  workOrders: number;
  pmCount: number;
  equipmentNoteImages: number;
  workOrderImages: number;
}

interface EquipmentNoteImage {
  id: string;
  file_url: string;
}

interface WorkOrderWithImages {
  id: string;
  images: Array<{
    id: string;
    file_url: string;
  }>;
}

// Check if user is admin of organization
const checkAdminAccess = async (orgId: string): Promise<void> => {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error('User not authenticated');

  const { data: member, error } = await supabase
    .from('organization_members')
    .select('role')
    .eq('user_id', userData.user.id)
    .eq('organization_id', orgId)
    .eq('status', 'active')
    .single();

  if (error || !member || !['owner', 'admin'].includes(member.role)) {
    throw new Error('Permission denied: You must be an admin or owner to delete equipment');
  }
};

// Get equipment note images
const getEquipmentNoteImages = async (equipmentId: string): Promise<EquipmentNoteImage[]> => {
  const { data, error } = await supabase
    .from('equipment_note_images')
    .select(`
      id,
      file_url,
      equipment_notes!inner (
        equipment_id
      )
    `)
    .eq('equipment_notes.equipment_id', equipmentId);

  if (error) throw error;
  return data || [];
};

// Get work orders with their images
const getWorkOrdersWithImages = async (equipmentId: string): Promise<WorkOrderWithImages[]> => {
  const { data: workOrders, error: woError } = await supabase
    .from('work_orders')
    .select('id')
    .eq('equipment_id', equipmentId);

  if (woError) throw woError;

  const workOrdersWithImages: WorkOrderWithImages[] = [];
  
  for (const wo of workOrders || []) {
    const { data: images, error: imgError } = await supabase
      .from('work_order_images')
      .select('id, file_url')
      .eq('work_order_id', wo.id);

    if (imgError) throw imgError;

    workOrdersWithImages.push({
      id: wo.id,
      images: images || []
    });
  }

  return workOrdersWithImages;
};

// Get PM count for work orders
const getPMCount = async (workOrderIds: string[]): Promise<number> => {
  if (workOrderIds.length === 0) return 0;

  const { count, error } = await supabase
    .from('preventative_maintenance')
    .select('*', { count: 'exact', head: true })
    .in('work_order_id', workOrderIds);

  if (error) throw error;
  return count || 0;
};

// Extract storage path from URL
const extractStoragePath = (fileUrl: string): string => {
  const url = new URL(fileUrl);
  const pathSegments = url.pathname.split('/');
  // Path format: /storage/v1/object/public/bucket/path
  return pathSegments.slice(5).join('/'); // Remove /storage/v1/object/public/bucket
};

// Delete equipment note images from storage
const deleteEquipmentNoteImagesFromStorage = async (images: EquipmentNoteImage[]): Promise<void> => {
  if (images.length === 0) return;

  const filePaths = images.map(img => extractStoragePath(img.file_url));
  
  const results = await Promise.allSettled(
    filePaths.map(path => 
      supabase.storage
        .from('equipment-note-images')
        .remove([path])
    )
  );

  // Log any failures but don't throw
  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      logger.warn(`Failed to delete equipment note image ${filePaths[index]}:`, result.reason);
    }
  });
};

export const getEquipmentDeletionImpact = async (equipmentId: string): Promise<EquipmentDeletionImpact> => {
  try {
    // Count work orders
    const { count: workOrderCount, error: woCountError } = await supabase
      .from('work_orders')
      .select('*', { count: 'exact', head: true })
      .eq('equipment_id', equipmentId);

    if (woCountError) throw woCountError;

    // Get work order IDs for PM count
    const { data: workOrders, error: woError } = await supabase
      .from('work_orders')
      .select('id')
      .eq('equipment_id', equipmentId);

    if (woError) throw woError;

    const workOrderIds = workOrders?.map(wo => wo.id) || [];

    // Count PMs
    const pmCount = await getPMCount(workOrderIds);

    // Count equipment note images
    const equipmentNoteImages = await getEquipmentNoteImages(equipmentId);

    // Count work order images
    const workOrdersWithImages = await getWorkOrdersWithImages(equipmentId);
    const workOrderImageCount = workOrdersWithImages.reduce((total, wo) => total + wo.images.length, 0);

    return {
      workOrders: workOrderCount || 0,
      pmCount,
      equipmentNoteImages: equipmentNoteImages.length,
      workOrderImages: workOrderImageCount
    };
  } catch (error) {
    logger.error('Error getting equipment deletion impact:', error);
    throw error;
  }
};

export const deleteEquipmentCascade = async (equipmentId: string, orgId: string): Promise<void> => {
  try {
    // Check admin access first
    await checkAdminAccess(orgId);

    logger.info(`Starting cascade deletion for equipment ${equipmentId}`);

    // Step 1: Collect all data that needs to be deleted
    logger.info('Collecting equipment note images...');
    const equipmentNoteImages = await getEquipmentNoteImages(equipmentId);

    logger.info('Collecting work orders with images...');
    const workOrdersWithImages = await getWorkOrdersWithImages(equipmentId);

    // Step 2: Delete work orders (this handles all WO-related data including PMs)
    logger.info(`Deleting ${workOrdersWithImages.length} work orders...`);
    for (const wo of workOrdersWithImages) {
      await deleteWorkOrder(wo.id);
    }

    // Step 3: Delete equipment note images (DB rows then storage)
    if (equipmentNoteImages.length > 0) {
      logger.info(`Deleting ${equipmentNoteImages.length} equipment note images from database...`);
      
      // Delete from database first
      const { error: dbDeleteError } = await supabase
        .from('equipment_note_images')
        .delete()
        .in('id', equipmentNoteImages.map(img => img.id));

      if (dbDeleteError) throw dbDeleteError;

      // Then delete from storage
      logger.info('Deleting equipment note images from storage...');
      await deleteEquipmentNoteImagesFromStorage(equipmentNoteImages);
    }

    // Step 4: Delete equipment notes
    logger.info('Deleting equipment notes...');
    const { error: notesError } = await supabase
      .from('equipment_notes')
      .delete()
      .eq('equipment_id', equipmentId);

    if (notesError) throw notesError;

    // Step 5: Delete scans (optional but tidy)
    logger.info('Deleting equipment scans...');
    const { error: scansError } = await supabase
      .from('scans')
      .delete()
      .eq('equipment_id', equipmentId);

    if (scansError) throw scansError;

    // Step 6: Finally delete the equipment record
    logger.info('Deleting equipment record...');
    const { error: equipmentError } = await supabase
      .from('equipment')
      .delete()
      .eq('id', equipmentId);

    if (equipmentError) throw equipmentError;

    logger.info(`Successfully deleted equipment ${equipmentId} and all related data`);

  } catch (error) {
    logger.error('Error in equipment cascade deletion:', error);
    throw error;
  }
};
