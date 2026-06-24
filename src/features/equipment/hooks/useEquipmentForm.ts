import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useAuth } from '@/hooks/useAuth';
import { useSession } from '@/hooks/useSession';
import {
  createEquipmentValidationSchema,
  equipmentFormSchema,
  EquipmentFormData,
  EquipmentRecord,
} from '@/features/equipment/types/equipment';
import { createValidationContext } from '@/utils/validationHelpers';
import { OfflineAwareWorkOrderService } from '@/services/offlineAwareService';
import { useOfflineQueueOptional } from '@/contexts/OfflineQueueContext';
import { toast } from 'sonner';
import { logEquipmentLocationChange } from '@/features/equipment/services/equipmentLocationHistoryService';
import {
  buildEquipmentFormDefaultValues,
  toEquipmentCreateData,
  toEquipmentUpdateData,
} from '@/features/equipment/utils/equipmentFormMappers';

/**
 * Map a raw equipment mutation error to an operator-friendly message. Permission
 * (RLS) denials get an actionable hint; everything else falls back to a generic
 * message. Duplicate-serial (23505) can no longer occur after migration
 * `20260623210000_equipment_serial_drop_unique.sql`.
 */
const getEquipmentMutationErrorMessage = (error: unknown, fallback: string): string => {
  const message = error instanceof Error ? error.message : String(error ?? '');
  if (/permission denied|row-level security|42501/i.test(message)) {
    return 'You do not have permission to do this. You must be an org admin, or a manager or technician on the selected team.';
  }
  return fallback;
};

export const useEquipmentForm = (initialData?: EquipmentRecord, onSuccess?: () => void) => {
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();
  const { currentOrganization } = useOrganization();
  const { user } = useAuth();
  const { sessionData } = useSession();
  const offlineCtx = useOfflineQueueOptional();

  const validationSchema = useMemo(() => {
    if (initialData || !currentOrganization) {
      return equipmentFormSchema;
    }

    const isOrgAdmin =
      currentOrganization.userRole === 'owner' || currentOrganization.userRole === 'admin';
    const context = createValidationContext(
      currentOrganization.userRole,
      isOrgAdmin,
      sessionData?.teamMemberships.map((membership) => ({
        team_id: membership.teamId,
        role: membership.role,
      })) ?? [],
    );

    return createEquipmentValidationSchema(context);
  }, [currentOrganization, initialData, sessionData?.teamMemberships]);

  const form = useForm<EquipmentFormData>({
    resolver: zodResolver(validationSchema),
    defaultValues: buildEquipmentFormDefaultValues(initialData),
  });

  const createMutation = useMutation({
    mutationFn: async (data: EquipmentFormData) => {
      if (!currentOrganization?.id || !user?.id) {
        throw new Error('Organization or user not found');
      }

      const service = new OfflineAwareWorkOrderService(currentOrganization.id, user.id);
      const createData = toEquipmentCreateData(data);
      const result = await service.createEquipmentFull(createData);

      if (result.queuedOffline) {
        return { id: 'offline', queuedOffline: true };
      }
      if (!result.data) throw new Error('Failed to create equipment');

      // Log location change if assigned location fields are present (only when online)
      if (
        data.assigned_location_street ||
        data.assigned_location_city ||
        data.assigned_location_state ||
        data.assigned_location_country ||
        data.assigned_location_lat != null ||
        data.assigned_location_lng != null
      ) {
        logEquipmentLocationChange({
          equipmentId: result.data.id,
          source: 'manual',
          latitude: data.assigned_location_lat ?? null,
          longitude: data.assigned_location_lng ?? null,
          addressStreet: data.assigned_location_street ?? null,
          addressCity: data.assigned_location_city ?? null,
          addressState: data.assigned_location_state ?? null,
          addressCountry: data.assigned_location_country ?? null,
        }).catch(() => {
          // Silently fail - logging is non-blocking
        });
      }

      return result.data;
    },
    onSuccess: (data) => {
      const queuedOffline = data && 'queuedOffline' in data && data.queuedOffline;
      if (queuedOffline) {
        toast.success('Saved offline — equipment will be created when you reconnect.');
        offlineCtx?.refresh();
      } else {
        queryClient.invalidateQueries({ queryKey: ['equipment', currentOrganization?.id] });
        queryClient.invalidateQueries({ queryKey: ['dashboard-stats', currentOrganization?.id] });
        queryClient.invalidateQueries({ queryKey: ['equipment-status-counts', currentOrganization?.id] });
        toast.success('Equipment created successfully');
      }
      form.reset();
      setIsOpen(false);
      onSuccess?.();
    },
    onError: (error) => {
      console.error('Equipment creation error:', error);
      toast.error(getEquipmentMutationErrorMessage(error, 'Failed to create equipment'));
    }
  });

  const updateMutation = useMutation({
    mutationFn: async (data: EquipmentFormData) => {
      if (!initialData?.id) {
        throw new Error('Equipment ID not found');
      }
      if (!currentOrganization?.id || !user?.id) {
        throw new Error('Organization or user not found');
      }

      const service = new OfflineAwareWorkOrderService(currentOrganization.id, user.id);
      const updateData = toEquipmentUpdateData(data);
      const result = await service.updateEquipment(
        initialData.id,
        updateData,
        initialData.updated_at,
      );

      if (result.queuedOffline) {
        return { id: initialData.id, queuedOffline: true };
      }
      if (!result.data) throw new Error('Failed to update equipment');

      // Log location change only if assigned location fields actually changed (only when online)
      const hasAssignedLocationChanged =
        (initialData.assigned_location_street ?? '') !== (data.assigned_location_street ?? '') ||
        (initialData.assigned_location_city ?? '') !== (data.assigned_location_city ?? '') ||
        (initialData.assigned_location_state ?? '') !== (data.assigned_location_state ?? '') ||
        (initialData.assigned_location_country ?? '') !== (data.assigned_location_country ?? '') ||
        (initialData.assigned_location_lat ?? null) !== (data.assigned_location_lat ?? null) ||
        (initialData.assigned_location_lng ?? null) !== (data.assigned_location_lng ?? null);

      if (hasAssignedLocationChanged) {
        logEquipmentLocationChange({
          equipmentId: initialData.id,
          source: 'manual',
          latitude: data.assigned_location_lat ?? null,
          longitude: data.assigned_location_lng ?? null,
          addressStreet: data.assigned_location_street ?? null,
          addressCity: data.assigned_location_city ?? null,
          addressState: data.assigned_location_state ?? null,
          addressCountry: data.assigned_location_country ?? null,
        }).catch(() => {
          // Silently fail - logging is non-blocking
        });
      }

      return result.data;
    },
    onSuccess: (data) => {
      const queuedOffline = data && 'queuedOffline' in data && data.queuedOffline;
      if (queuedOffline) {
        toast.success('Saved offline — equipment will be updated when you reconnect.');
        offlineCtx?.refresh();
      } else {
        queryClient.invalidateQueries({ queryKey: ['equipment', currentOrganization?.id] });
        queryClient.invalidateQueries({ queryKey: ['equipment', currentOrganization?.id, initialData?.id] });
        toast.success('Equipment updated successfully');
      }
      setIsOpen(false);
      onSuccess?.();
    },
    onError: (error) => {
      console.error('Equipment update error:', error);
      toast.error(getEquipmentMutationErrorMessage(error, 'Failed to update equipment'));
    }
  });

  const onSubmit = (data: EquipmentFormData) => {
    if (initialData) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  return {
    form,
    onSubmit,
    isEdit: !!initialData,
    isPending: createMutation.isPending || updateMutation.isPending,
    isOpen,
    setIsOpen
  };
};
