
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useAuth } from '@/hooks/useAuth';
import { equipmentFormSchema, EquipmentFormData, EquipmentRecord } from '@/features/equipment/types/equipment';
import { toast } from 'sonner';
import { shallowEqual } from '@/utils/object-utils';

export const useEquipmentForm = (initialData?: EquipmentRecord, onSuccess?: () => void) => {
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();
  const { currentOrganization } = useOrganization();
  const { user } = useAuth();

  const form = useForm<EquipmentFormData>({
    resolver: zodResolver(equipmentFormSchema),
    defaultValues: initialData ? {
      name: initialData.name,
      manufacturer: initialData.manufacturer,
      model: initialData.model,
      serial_number: initialData.serial_number,
      status: initialData.status,
      location: initialData.location,
      installation_date: initialData.installation_date,
      warranty_expiration: initialData.warranty_expiration || '',
      last_maintenance: initialData.last_maintenance || '',
      notes: initialData.notes || '',
      custom_attributes: initialData.custom_attributes || {},
      image_url: initialData.image_url || '',
      last_known_location: initialData.last_known_location || undefined,
      team_id: initialData.team_id || '',
      default_pm_template_id: initialData.default_pm_template_id || ''
    } : {
      name: '',
      manufacturer: '',
      model: '',
      serial_number: '',
      status: 'active' as const,
      location: '',
      installation_date: new Date().toISOString().split('T')[0],
      warranty_expiration: '',
      last_maintenance: '',
      notes: '',
      custom_attributes: {},
      image_url: '',
      last_known_location: undefined,
      team_id: '',
      default_pm_template_id: ''
    }
  });

  const createMutation = useMutation({
    mutationFn: async (data: EquipmentFormData) => {
      if (!currentOrganization?.id || !user?.id) {
        throw new Error('Organization or user not found');
      }

      const equipmentData = {
        name: data.name,
        manufacturer: data.manufacturer,
        model: data.model,
        serial_number: data.serial_number,
        status: data.status,
        location: data.location,
        installation_date: data.installation_date,
        organization_id: currentOrganization.id,
        customer_id: null,
        warranty_expiration: data.warranty_expiration || null,
        last_maintenance: data.last_maintenance || null,
        last_maintenance_work_order_id: null,
        notes: data.notes || null,
        custom_attributes: data.custom_attributes || {},
        image_url: data.image_url || null,
        last_known_location: data.last_known_location || null,
        team_id: data.team_id || null,
        default_pm_template_id: data.default_pm_template_id || null,
        working_hours: 0,
        import_id: null
      };

      const { data: result, error } = await supabase
        .from('equipment')
        .insert(equipmentData)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      // Invalidate with organization-specific key pattern
      queryClient.invalidateQueries({ queryKey: ['equipment', currentOrganization?.id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats', currentOrganization?.id] });
      queryClient.invalidateQueries({ queryKey: ['equipment-status-counts', currentOrganization?.id] });
      toast.success('Equipment created successfully');
      form.reset();
      setIsOpen(false);
      onSuccess?.();
    },
    onError: (error) => {
      console.error('Equipment creation error:', error);
      toast.error('Failed to create equipment');
    }
  });

  const updateMutation = useMutation({
    mutationFn: async (data: EquipmentFormData) => {
      if (!initialData?.id) {
        throw new Error('Equipment ID not found');
      }

      const normalizedData = {
        name: data.name,
        manufacturer: data.manufacturer,
        model: data.model,
        serial_number: data.serial_number,
        status: data.status,
        location: data.location,
        installation_date: data.installation_date,
        warranty_expiration: data.warranty_expiration || null,
        last_maintenance: data.last_maintenance || null,
        notes: data.notes || null,
        custom_attributes: data.custom_attributes || {},
        image_url: data.image_url || null,
        last_known_location: data.last_known_location || null,
        team_id: data.team_id || null,
        default_pm_template_id: data.default_pm_template_id || null
      };

      const normalizedInitial = {
        name: initialData.name,
        manufacturer: initialData.manufacturer,
        model: initialData.model,
        serial_number: initialData.serial_number,
        status: initialData.status,
        location: initialData.location,
        installation_date: initialData.installation_date,
        warranty_expiration: initialData.warranty_expiration ?? null,
        last_maintenance: initialData.last_maintenance ?? null,
        notes: initialData.notes ?? null,
        custom_attributes: initialData.custom_attributes ?? {},
        image_url: initialData.image_url ?? null,
        last_known_location: initialData.last_known_location ?? null,
        team_id: initialData.team_id ?? null,
        default_pm_template_id: initialData.default_pm_template_id ?? null
      };

      const equipmentData = Object.entries(normalizedData).reduce((acc, [key, value]) => {
        const initialValue = normalizedInitial[key as keyof typeof normalizedInitial];
        const isEqual = typeof value === 'object' && value !== null && typeof initialValue === 'object' && initialValue !== null
          ? shallowEqual(value, initialValue)
          : value === initialValue;

        if (!isEqual) {
          acc[key] = value;
        }

        return acc;
      }, {} as Record<string, unknown>);

      if ('last_maintenance' in equipmentData) {
        equipmentData.last_maintenance_work_order_id = null;
      }

      // If no changes detected, still complete the mutation to ensure callbacks run
      if (Object.keys(equipmentData).length === 0) {
        // Return initialData but ensure mutation callbacks are still called
        // The mutation will complete successfully with no-op
        return initialData;
      }

      const { data: result, error } = await supabase
        .from('equipment')
        .update(equipmentData)
        .eq('id', initialData.id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      // Invalidate with organization-specific key pattern
      queryClient.invalidateQueries({ queryKey: ['equipment', currentOrganization?.id] });
      queryClient.invalidateQueries({ queryKey: ['equipment', currentOrganization?.id, initialData?.id] });
      toast.success('Equipment updated successfully');
      setIsOpen(false);
      onSuccess?.();
    },
    onError: (error) => {
      console.error('Equipment update error:', error);
      toast.error('Failed to update equipment');
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
