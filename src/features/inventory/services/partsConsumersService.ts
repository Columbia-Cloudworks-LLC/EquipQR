import { logger } from '@/utils/logger';
import {
  addPartsRoleAssignee,
  fetchPartsRoleAssignees,
  isUserInPartsRole,
  removePartsRoleAssignee,
  type PartsRoleRecord,
} from '@/features/inventory/services/partsRoleServiceHelpers';

export type PartsConsumer = PartsRoleRecord;

export const getPartsConsumers = async (organizationId: string): Promise<PartsConsumer[]> => {
  try {
    return await fetchPartsRoleAssignees('parts_consumers', organizationId);
  } catch (error) {
    logger.error('Error in getPartsConsumers:', error);
    throw error;
  }
};

export const isUserPartsConsumer = async (
  organizationId: string,
  userId: string,
): Promise<boolean> => isUserInPartsRole('parts_consumers', organizationId, userId);

export const addPartsConsumer = async (
  organizationId: string,
  userId: string,
  assignedBy: string,
): Promise<PartsConsumer> => {
  try {
    return await addPartsRoleAssignee('parts_consumers', organizationId, userId, assignedBy);
  } catch (error) {
    logger.error('Error in addPartsConsumer:', error);
    throw error;
  }
};

export const removePartsConsumer = async (
  organizationId: string,
  userId: string,
): Promise<void> => {
  try {
    await removePartsRoleAssignee('parts_consumers', organizationId, userId);
  } catch (error) {
    logger.error('Error in removePartsConsumer:', error);
    throw error;
  }
};
