/**
 * Organization Service - Canonical service for organization operations
 */

import { logger } from '@/utils/logger';
import { supabase } from '@/integrations/supabase/client';
import type { OrganizationUpdatePayload } from '@/features/organization/types/organization';
import {
  uploadImageToStorage,
  deleteImageFromStorage,
  generateSingleFilePath,
  validateImageFile,
} from '@/services/imageUploadService';

// ============================================
// Organization Update Functions
// ============================================

/**
 * Update organization information
 */
export const updateOrganization = async (organizationId: string, updates: OrganizationUpdatePayload): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('organizations')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', organizationId);

    if (error) throw error;
    return true;
  } catch (error) {
    logger.error('Error updating organization:', error, { organizationId, updates });
    return false;
  }
};

// ============================================
// Organization Logo Functions
// ============================================

/**
 * Upload an organization logo to Supabase Storage and update the organizations table.
 * Returns the public URL of the uploaded logo.
 */
export const uploadOrganizationLogo = async (
  organizationId: string,
  file: File
): Promise<string> => {
  validateImageFile(file, 5);

  const filePath = generateSingleFilePath(organizationId, 'logo', file);
  const publicUrl = await uploadImageToStorage(
    'organization-logos',
    filePath,
    file,
    { upsert: true, compress: false }
  );

  // Update the organizations table with the new logo URL
  const { error } = await supabase
    .from('organizations')
    .update({ logo: publicUrl, updated_at: new Date().toISOString() })
    .eq('id', organizationId);

  if (error) {
    logger.error('Error updating organization logo in DB:', error);
    // Clean up orphaned storage file since DB update failed
    try {
      await deleteImageFromStorage('organization-logos', publicUrl);
    } catch (deleteError) {
      logger.error('Failed to delete orphaned logo from storage:', deleteError);
    }
    throw new Error('Failed to save logo');
  }

  return publicUrl;
};

/**
 * Delete the organization logo from storage and clear the column.
 */
export const deleteOrganizationLogo = async (
  organizationId: string,
  currentLogoUrl: string
): Promise<void> => {
  // Clear the DB column first so the app never references a deleted file
  const { error } = await supabase
    .from('organizations')
    .update({ logo: null, updated_at: new Date().toISOString() })
    .eq('id', organizationId);

  if (error) {
    logger.error('Error clearing organization logo:', error);
    throw new Error('Failed to remove logo');
  }

  // Best-effort storage cleanup — DB column is already cleared so the UI
  // won't render a broken image even if this fails.
  try {
    await deleteImageFromStorage('organization-logos', currentLogoUrl);
  } catch (storageError) {
    logger.error('Failed to delete organization logo from storage (DB already cleared):', storageError);
  }
};
