
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSimpleOrganization } from '@/hooks/useSimpleOrganization';
import { useAuth } from '@/hooks/useAuth';
import { equipmentFormSchema, EquipmentFormData, EquipmentRecord } from '@/types/equipment';
import { showErrorToast, showSuccessToast } from '@/utils/errorHandling';

export const useEquipmentForm = (initialData?: EquipmentRecord, onSuccess?: () => void) => {
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();
  const { currentOrganization } = useSimpleOrganization();
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
        ...data,
        organization_id: currentOrganization.id,
        customer_id: null, // Make customer_id optional/nullable
        warranty_expiration: data.warranty_expiration || null,
        last_maintenance: data.last_maintenance || null,
        notes: data.notes || null,
        image_url: data.image_url || null,
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
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      showSuccessToast('Equipment created successfully');
      form.reset();
      setIsOpen(false);
      onSuccess?.();
    },
    onError: (error) => {
      console.error('Equipment creation error:', error);
      showErrorToast(error, 'Equipment Creation');
    }
  });

  const updateMutation = useMutation({
    mutationFn: async (data: EquipmentFormData) => {
      if (!initialData?.id) {
        throw new Error('Equipment ID not found');
      }

      const equipmentData = {
        ...data,
        warranty_expiration: data.warranty_expiration || null,
        last_maintenance: data.last_maintenance || null,
        notes: data.notes || null,
        image_url: data.image_url || null,
        team_id: data.team_id || null,
        default_pm_template_id: data.default_pm_template_id || null
      };

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
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      showSuccessToast('Equipment updated successfully');
      setIsOpen(false);
      onSuccess?.();
    },
    onError: (error) => {
      console.error('Equipment update error:', error);
      showErrorToast(error, 'Equipment Update');
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
    isLoading: createMutation.isPending || updateMutation.isPending,
    isOpen,
    setIsOpen
  };
};
