/**
 * Parts Managers Service
 *
 * Handles CRUD operations for organization-level parts managers.
 * Parts managers can edit all inventory items in their organization.
 */

import { logger } from '@/utils/logger';
import {
  addPartsRoleAssignee,
  fetchPartsRoleAssignees,
  isUserInPartsRole,
  removePartsRoleAssignee,
  type PartsRoleRecord,
} from '@/features/inventory/services/partsRoleServiceHelpers';

export type PartsManager = PartsRoleRecord;

export const getPartsManagers = async (organizationId: string): Promise<PartsManager[]> => {
  try {
    return await fetchPartsRoleAssignees('parts_managers', organizationId);
  } catch (error) {
    logger.error('Error in getPartsManagers:', error);
    throw error;
  }
};

export const isUserPartsManager = async (
  organizationId: string,
  userId: string,
): Promise<boolean> => isUserInPartsRole('parts_managers', organizationId, userId);

export const addPartsManager = async (
  organizationId: string,
  userId: string,
  assignedBy: string,
): Promise<PartsManager> => {
  try {
    return await addPartsRoleAssignee('parts_managers', organizationId, userId, assignedBy);
  } catch (error) {
    logger.error('Error in addPartsManager:', error);
    throw error;
  }
};

export const removePartsManager = async (
  organizationId: string,
  userId: string,
): Promise<void> => {
  try {
    await removePartsRoleAssignee('parts_managers', organizationId, userId);
  } catch (error) {
    logger.error('Error in removePartsManager:', error);
    throw error;
  }
};
