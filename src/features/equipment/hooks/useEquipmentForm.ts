import { useState, useMemo, useRef, type MutableRefObject } from 'react';
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
import { useAppToast } from '@/hooks/useAppToast';
import { logEquipmentLocationChange } from '@/features/equipment/services/equipmentLocationHistoryService';
import {
  buildEquipmentFormDefaultValues,
  toEquipmentCreateData,
  toEquipmentUpdateData,
} from '@/features/equipment/utils/equipmentFormMappers';
import {
  createEquipmentNoteWithImages,
  updateEquipmentDisplayImage,
} from '@/features/equipment/services/equipmentNotesService';
import type { EquipmentFormPendingMedia } from '@/features/equipment/components/form/EquipmentFormMediaSection';
import { equipment } from '@/lib/queryKeys';
import { extractEquipmentDisplayImagePath } from '@/services/imageUploadService';

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

export const useEquipmentForm = (
  initialData?: EquipmentRecord,
  onSuccess?: () => void,
  pendingMediaRef?: MutableRefObject<EquipmentFormPendingMedia>,
  onCreated?: (equipmentId: string) => void,
) => {
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();
  const { currentOrganization } = useOrganization();
  const { user } = useAuth();
  const { sessionData } = useSession();
  const offlineCtx = useOfflineQueueOptional();
  const { warning: showWarningToast } = useAppToast();
  const localPendingRef = useRef<EquipmentFormPendingMedia>({ files: [], displayIndex: 0 });
  const mediaRef = pendingMediaRef ?? localPendingRef;

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
        return { id: 'offline', queuedOffline: true as const };
      }
      if (!result.data) throw new Error('Failed to create equipment');

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

      let mediaUploadFailed = false;
      const pending = mediaRef.current;
      if (pending.files.length > 0) {
        try {
          const userName = user.email?.split('@')[0] || 'User';
          const noteContent =
            pending.files.length === 1
              ? `${userName} uploaded a display image`
              : `${userName} uploaded ${pending.files.length} images at creation`;
          const note = await createEquipmentNoteWithImages(
            result.data.id,
            noteContent,
            0,
            false,
            pending.files,
            currentOrganization.id,
          );
          if (!note.images || note.images.length === 0) {
            mediaUploadFailed = true;
          } else {
            if (note.images.length < pending.files.length) {
              mediaUploadFailed = true;
            }
            const displayImage =
              note.images[pending.displayIndex] ?? note.images[0] ?? null;
            if (displayImage?.file_url) {
              try {
                const path =
                  extractEquipmentDisplayImagePath(displayImage.file_url) ?? displayImage.file_url;
                await updateEquipmentDisplayImage(currentOrganization.id, result.data.id, path);
              } catch (displayError) {
                console.error('Post-create equipment display image update failed:', displayError);
                mediaUploadFailed = true;
              }
            }
          }
        } catch (error) {
          console.error('Post-create equipment media upload failed:', error);
          mediaUploadFailed = true;
        }
        if (mediaUploadFailed) {
          await queryClient.invalidateQueries({ queryKey: equipment.images(result.data.id) });
        }
      }

      return mediaUploadFailed
        ? { ...result.data, mediaUploadFailed: true as const }
        : result.data;
    },
    onSuccess: (data) => {
      const queuedOffline = data && 'queuedOffline' in data && data.queuedOffline;
      if (queuedOffline) {
        toast.success('Saved offline — equipment will be created when you reconnect.');
        offlineCtx?.refresh();
      } else {
        queryClient.invalidateQueries({ queryKey: equipment.list(currentOrganization?.id ?? '') });
        queryClient.invalidateQueries({ queryKey: ['dashboard-stats', currentOrganization?.id] });
        queryClient.invalidateQueries({ queryKey: ['equipment-status-counts', currentOrganization?.id] });
        if (data && 'id' in data && typeof data.id === 'string') {
          queryClient.invalidateQueries({ queryKey: equipment.images(data.id) });
        }
        if (data && 'mediaUploadFailed' in data && data.mediaUploadFailed) {
          showWarningToast({
            description:
              'Equipment created, but media upload failed. Add photos from the equipment details page.',
          });
        } else {
          toast.success('Equipment created successfully');
        }
      }
      mediaRef.current = { files: [], displayIndex: 0 };
      form.reset();
      setIsOpen(false);
      onSuccess?.();
      if (
        !queuedOffline &&
        data &&
        'id' in data &&
        typeof data.id === 'string' &&
        data.id !== 'offline'
      ) {
        onCreated?.(data.id);
      }
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
        return { id: initialData.id, queuedOffline: true as const };
      }
      if (!result.data) throw new Error('Failed to update equipment');

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
        queryClient.invalidateQueries({ queryKey: equipment.list(currentOrganization?.id ?? '') });
        queryClient.invalidateQueries({
          queryKey: equipment.byId(currentOrganization?.id ?? '', initialData?.id ?? ''),
        });
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
