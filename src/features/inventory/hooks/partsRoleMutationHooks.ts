import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useAppToast } from '@/hooks/useAppToast';

type AddPartsRoleVariables = {
  organizationId: string;
  userId: string;
};

type AddPartsRoleConfig = {
  addAssignee: (organizationId: string, userId: string, assignedBy: string) => Promise<unknown>;
  listQueryKey: (organizationId: string) => readonly unknown[];
  statusQueryKey: (organizationId: string, userId: string) => readonly unknown[];
  successTitle: string;
  successDescription: string;
  errorTitle: string;
  errorFallback: string;
};

export function createAddPartsRoleMutation(config: AddPartsRoleConfig) {
  return function useAddPartsRole() {
    const queryClient = useQueryClient();
    const { user } = useAuth();
    const { toast } = useAppToast();

    return useMutation({
      mutationFn: async ({ organizationId, userId }: AddPartsRoleVariables) => {
        if (!user) throw new Error('User not authenticated');
        return await config.addAssignee(organizationId, userId, user.id);
      },
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({
          queryKey: config.listQueryKey(variables.organizationId),
        });
        queryClient.invalidateQueries({
          queryKey: config.statusQueryKey(variables.organizationId, variables.userId),
        });
        toast({
          title: config.successTitle,
          description: config.successDescription,
        });
      },
      onError: (error) => {
        toast({
          title: config.errorTitle,
          description: error instanceof Error ? error.message : config.errorFallback,
          variant: 'error',
        });
      },
    });
  };
}

type RemovePartsRoleConfig = {
  removeAssignee: (organizationId: string, userId: string) => Promise<void>;
  listQueryKey: (organizationId: string) => readonly unknown[];
  statusQueryKey: (organizationId: string, userId: string) => readonly unknown[];
  successTitle: string;
  successDescription: string;
  errorTitle: string;
  errorFallback: string;
};

export function createRemovePartsRoleMutation(config: RemovePartsRoleConfig) {
  return function useRemovePartsRole() {
    const queryClient = useQueryClient();
    const { toast } = useAppToast();

    return useMutation({
      mutationFn: async ({ organizationId, userId }: AddPartsRoleVariables) => {
        await config.removeAssignee(organizationId, userId);
      },
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({
          queryKey: config.listQueryKey(variables.organizationId),
        });
        queryClient.invalidateQueries({
          queryKey: config.statusQueryKey(variables.organizationId, variables.userId),
        });
        toast({
          title: config.successTitle,
          description: config.successDescription,
        });
      },
      onError: (error) => {
        toast({
          title: config.errorTitle,
          description: error instanceof Error ? error.message : config.errorFallback,
          variant: 'error',
        });
      },
    });
  };
}
