import { useMutation, useQuery } from '@tanstack/react-query';
import {
  executeAccountDeletion,
  previewAccountDeletion,
  requestManualDeletionReview,
  type AccountDeletionPreview,
} from '@/services/accountDeletionService';

export function useAccountDeletionPreview(enabled: boolean) {
  return useQuery<AccountDeletionPreview>({
    queryKey: ['account-deletion-preview'],
    queryFn: previewAccountDeletion,
    enabled,
    staleTime: 0,
    retry: false,
  });
}

export function useExecuteAccountDeletion() {
  return useMutation({
    mutationFn: executeAccountDeletion,
  });
}

export function useRequestManualDeletionReview() {
  return useMutation({
    mutationFn: requestManualDeletionReview,
  });
}
