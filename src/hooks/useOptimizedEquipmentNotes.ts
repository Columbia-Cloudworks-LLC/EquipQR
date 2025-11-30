/**
 * Equipment Notes Hooks - Canonical hooks for equipment notes
 * 
 * These hooks use the consolidated equipmentNotesService.
 * Import from here instead of using separate optimized hooks.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  getEquipmentNotesOptimized, 
  getUserEquipmentNotes, 
  getRecentOrganizationNotes 
} from '@/services/equipmentNotesService';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook for fetching equipment notes
 */
export const useEquipmentNotes = (equipmentId: string) => {
  return useQuery({
    queryKey: ['equipment-notes', equipmentId],
    queryFn: () => getEquipmentNotesOptimized(equipmentId),
    enabled: !!equipmentId,
    staleTime: 30 * 1000, // 30 seconds
  });
};

/**
 * @deprecated Use useEquipmentNotes instead
 */
export const useOptimizedEquipmentNotes = useEquipmentNotes;

/**
 * Hook for fetching user's equipment notes
 */
export const useUserEquipmentNotes = (equipmentId: string, userId: string) => {
  return useQuery({
    queryKey: ['user-equipment-notes', equipmentId, userId],
    queryFn: () => getUserEquipmentNotes(equipmentId, userId),
    enabled: !!equipmentId && !!userId,
    staleTime: 30 * 1000,
  });
};

/**
 * @deprecated Use useUserEquipmentNotes instead
 */
export const useOptimizedUserEquipmentNotes = useUserEquipmentNotes;

/**
 * Hook for fetching recent organization notes
 */
export const useRecentOrganizationNotes = (organizationId: string, limit?: number) => {
  return useQuery({
    queryKey: ['recent-org-notes', organizationId, limit],
    queryFn: () => getRecentOrganizationNotes(organizationId, limit),
    enabled: !!organizationId,
    staleTime: 60 * 1000, // 1 minute
  });
};

/**
 * @deprecated Use useRecentOrganizationNotes instead
 */
export const useOptimizedRecentOrganizationNotes = useRecentOrganizationNotes;

/**
 * Hook for creating equipment notes
 */
export const useCreateEquipmentNote = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (noteData: {
      equipment_id: string;
      content: string;
      is_private?: boolean;
      hours_worked?: number;
    }) => {
      const { data, error } = await supabase
        .from('equipment_notes')
        .insert([{
          ...noteData,
          author_id: (await supabase.auth.getUser()).data.user?.id
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['equipment-notes', data.equipment_id] });
      queryClient.invalidateQueries({ queryKey: ['user-equipment-notes'] });
      queryClient.invalidateQueries({ queryKey: ['recent-org-notes'] });
      // Also invalidate legacy keys for backward compatibility
      queryClient.invalidateQueries({ queryKey: ['equipment-notes-optimized', data.equipment_id] });
    },
  });
};