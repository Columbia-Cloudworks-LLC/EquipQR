import { vi } from 'vitest';
import type { UseMutationResult, UseQueryResult } from '@tanstack/react-query';

/** Cast a minimal mutation mock to the full UseMutationResult shape expected by hooks. */
export function mockMutationResult<TData = unknown, TError = Error, TVariables = void, TContext = unknown>(
  partial: Pick<UseMutationResult<TData, TError, TVariables, TContext>, 'mutateAsync' | 'isPending'> &
    Partial<UseMutationResult<TData, TError, TVariables, TContext>>,
): UseMutationResult<TData, TError, TVariables, TContext> {
  return partial as unknown as UseMutationResult<TData, TError, TVariables, TContext>;
}

/** Cast a minimal query mock to the full UseQueryResult shape expected by hooks. */
export function mockQueryResult<TData = unknown, TError = Error>(
  partial: Partial<UseQueryResult<TData, TError>> & Pick<UseQueryResult<TData, TError>, 'data' | 'isLoading'>,
): UseQueryResult<TData, TError> {
  return partial as unknown as UseQueryResult<TData, TError>;
}

/** Minimal PM template summary fixture with required interval fields. */
export function createMockPMTemplateSummary(
  overrides: Partial<{
    id: string;
    name: string;
    description: string | null;
    is_protected: boolean;
    organization_id: string | null;
    interval_value: number | null;
    interval_type: 'days' | 'hours' | null;
    sections: { name: string; count: number }[];
    itemCount: number;
  }> = {},
) {
  return {
    id: 'template-1',
    name: 'Test Template',
    description: null,
    is_protected: false,
    organization_id: 'org-1',
    interval_value: null,
    interval_type: null,
    sections: [],
    itemCount: 0,
    ...overrides,
  };
}

/** Minimal SimpleOrganization fixture including scanLocationCollectionEnabled. */
export function createMockSimpleOrganization(
  overrides: Partial<{
    id: string;
    name: string;
    plan: 'free' | 'premium' | 'professional';
    memberCount: number;
    maxMembers: number;
    features: string[];
    userRole: 'owner' | 'admin' | 'member';
    userStatus: 'active' | 'pending' | 'inactive';
    scanLocationCollectionEnabled: boolean;
  }> = {},
) {
  return {
    id: 'org-1',
    name: 'Test Org',
    plan: 'free' as const,
    memberCount: 1,
    maxMembers: 10,
    features: [] as string[],
    userRole: 'admin' as const,
    userStatus: 'active' as const,
    scanLocationCollectionEnabled: true,
    ...overrides,
  };
}

/** noop mutate for mutation mocks */
export const noopMutate = vi.fn();
