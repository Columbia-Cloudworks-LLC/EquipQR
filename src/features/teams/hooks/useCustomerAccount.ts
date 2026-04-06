import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import {
  getCustomersByOrg,
  getCustomerById,
  createCustomer,
  updateCustomer,
  linkTeamToCustomer,
  importCustomerFromQB,
  refreshCustomerFromQB,
  getExternalContacts,
  createExternalContact,
  updateExternalContact,
  deleteExternalContact,
} from '@/features/teams/services/customerAccountService';
import type {
  CustomerInsert,
  CustomerUpdate,
  ExternalContactInsert,
  ExternalContactUpdate,
} from '@/features/teams/types/team';
import type { QBCustomerPayload } from '@/features/teams/services/customerAccountService';

// ============================================
// Customer Account Queries
// ============================================

export function useCustomersByOrg(organizationId: string | undefined) {
  return useQuery({
    queryKey: ['customers', organizationId],
    queryFn: () => getCustomersByOrg(organizationId!),
    enabled: !!organizationId,
    staleTime: 1000 * 60 * 2,
  });
}

export function useCustomer(customerId: string | undefined) {
  return useQuery({
    queryKey: ['customer', customerId],
    queryFn: () => getCustomerById(customerId!),
    enabled: !!customerId,
    staleTime: 1000 * 60 * 2,
  });
}

// ============================================
// Customer Account Mutations
// ============================================

export function useCustomerMutations(organizationId: string | undefined) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['customers', organizationId] });
    queryClient.invalidateQueries({ queryKey: ['teams', organizationId] });
  };

  const create = useMutation({
    mutationFn: (data: CustomerInsert) => createCustomer(data),
    onSuccess: () => invalidate(),
    onError: (err: Error) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  const update = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: CustomerUpdate }) =>
      updateCustomer(id, updates, organizationId),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['customer', vars.id] });
      invalidate();
    },
    onError: (err: Error) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  const link = useMutation({
    mutationFn: ({ teamId, customerId }: { teamId: string; customerId: string | null }) =>
      linkTeamToCustomer(teamId, customerId, organizationId),
    onSuccess: () => invalidate(),
    onError: (err: Error) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  const importFromQB = useMutation({
    mutationFn: ({ qb }: { qb: QBCustomerPayload }) =>
      importCustomerFromQB(organizationId!, qb),
    onSuccess: () => {
      toast({ title: 'Imported', description: 'Customer imported from QuickBooks' });
      invalidate();
    },
    onError: (err: Error) => {
      toast({ title: 'Import failed', description: err.message, variant: 'destructive' });
    },
  });

  const refreshFromQB = useMutation({
    mutationFn: ({ customerId, qb }: { customerId: string; qb: QBCustomerPayload }) =>
      refreshCustomerFromQB(customerId, qb),
    onSuccess: (_data, vars) => {
      toast({ title: 'Refreshed', description: 'Customer data refreshed from QuickBooks' });
      queryClient.invalidateQueries({ queryKey: ['customer', vars.customerId] });
      invalidate();
    },
    onError: (err: Error) => {
      toast({ title: 'Refresh failed', description: err.message, variant: 'destructive' });
    },
  });

  return { create, update, link, importFromQB, refreshFromQB };
}

// ============================================
// External Contacts
// ============================================

export function useExternalContacts(customerId: string | undefined) {
  return useQuery({
    queryKey: ['external-contacts', customerId],
    queryFn: () => getExternalContacts(customerId!),
    enabled: !!customerId,
    staleTime: 1000 * 60 * 2,
  });
}

export function useExternalContactMutations(customerId: string | undefined) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['external-contacts', customerId] });
  };

  const create = useMutation({
    mutationFn: (data: ExternalContactInsert) => createExternalContact(data),
    onSuccess: () => {
      toast({ title: 'Contact added' });
      invalidate();
    },
    onError: (err: Error) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  const update = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: ExternalContactUpdate }) =>
      updateExternalContact(id, updates),
    onSuccess: () => {
      toast({ title: 'Contact updated' });
      invalidate();
    },
    onError: (err: Error) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  const remove = useMutation({
    mutationFn: (contactId: string) => deleteExternalContact(contactId),
    onSuccess: () => {
      toast({ title: 'Contact removed' });
      invalidate();
    },
    onError: (err: Error) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  return { create, update, remove };
}
