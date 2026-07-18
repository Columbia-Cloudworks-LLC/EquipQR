import { waitFor, type RenderHookResult } from '@testing-library/react';
import { expect, vi } from 'vitest';
import type { useAuth } from '@/hooks/useAuth';
import { personas } from '@vitest-harness/fixtures/personas';
import type { UserPersona } from '@vitest-harness/fixtures/personas';

/** Minimal auth mock for hook tests that only need a signed-in admin user. */
export function createAdminAuthMockReturn(
  persona: UserPersona = personas.admin,
): ReturnType<typeof useAuth> {
  return {
    user: { id: persona.id, email: persona.email },
    session: { user: { id: persona.id } },
    isLoading: false,
    signUp: vi.fn(),
    signIn: vi.fn(),
    signInWithGoogle: vi.fn(),
    signOut: vi.fn(),
  } as unknown as ReturnType<typeof useAuth>;
}

/** Wire `useAuth` and `useAppToast` mocks for inventory-style hook suites. */
export function setupAuthAndToastMocks(
  useAuth: typeof import('@/hooks/useAuth').useAuth,
  useAppToast: typeof import('@/hooks/useAppToast').useAppToast,
  mockToast: ReturnType<typeof vi.fn>,
  persona: UserPersona = personas.admin,
): void {
  vi.mocked(useAuth).mockReturnValue(createAdminAuthMockReturn(persona));
  vi.mocked(useAppToast).mockReturnValue({
    toast: mockToast,
  } as unknown as ReturnType<typeof useAppToast>);
}

/** Wait until a React Query hook reports success. */
export async function waitForHookSuccess<T>(
  result: RenderHookResult<T, unknown>['result'],
): Promise<void> {
  await waitFor(() => {
    expect((result.current as { isSuccess?: boolean }).isSuccess).toBe(true);
  });
}

/** Assert hook data after `waitForHookSuccess`. */
export function expectHookData<TData>(
  result: RenderHookResult<{ data: TData }, unknown>['result'],
  expected: TData,
): void {
  expect(result.current.data).toEqual(expected);
}

export { createReactRouterDomTestMock } from '@vitest-harness/utils/react-router-dom-test-mock';
