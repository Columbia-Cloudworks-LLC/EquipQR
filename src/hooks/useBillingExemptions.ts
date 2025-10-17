import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listExemptions,
  createExemption,
  updateExemption,
  deleteExemption,
  listOrganizations,
} from '@/services/billingExemptionsService';
import type { ExemptionFormData } from '@/types/billingExemptions';
import { useToast } from './use-toast';

/**
 * Hook to fetch billing exemptions
 */
export function useExemptions(organizationId?: string) {
  return useQuery({
    queryKey: ['billing-exemptions', organizationId],
    queryFn: () => listExemptions(organizationId),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Hook to create a billing exemption
 */
export function useCreateExemption() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: ExemptionFormData) => createExemption(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['billing-exemptions'] });
      queryClient.invalidateQueries({ 
        queryKey: ['billing-exemptions', variables.organization_id] 
      });
      toast({
        title: 'Exemption Created',
        description: 'The billing exemption has been successfully created.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create exemption',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to update a billing exemption
 */
export function useUpdateExemption() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ExemptionFormData> & { is_active?: boolean } }) =>
      updateExemption(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing-exemptions'] });
      toast({
        title: 'Exemption Updated',
        description: 'The billing exemption has been successfully updated.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update exemption',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to delete a billing exemption
 */
export function useDeleteExemption() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => deleteExemption(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing-exemptions'] });
      toast({
        title: 'Exemption Deleted',
        description: 'The billing exemption has been successfully deleted.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete exemption',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to fetch all organizations for admin dropdown
 */
export function useAdminOrganizations() {
  return useQuery({
    queryKey: ['admin-organizations'],
    queryFn: listOrganizations,
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
}

