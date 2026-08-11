// Re-export testing library functions
export * from '@testing-library/react';
export {
  clickButtonWhenReady,
  clickButtonWhenReadyWithUser,
  waitForButton,
} from './rtl-helpers';
export { createSettingsTestWrapper, SYDNEY_USER_SETTINGS } from './settings-test-wrapper';
export { ensureElementFromPointMock } from './mfa-test-setup';
export { createSupabaseQueryMock, createSupabaseOrderQueryMock } from './supabase-mock-query';
export {
  createTestQueryClient,
  createQueryClientWrapper,
  createRouterQueryClientWrapper,
} from './query-client-wrapper';
export {
  createAdminAuthMockReturn,
  setupAuthAndToastMocks,
  waitForHookSuccess,
  expectHookData,
  createReactRouterDomTestMock,
  mockSonnerAndLogger,
} from './hook-test-helpers';
// Re-export custom render
export { customRender as render } from './renderUtils';

// Re-export persona utilities
export { renderAsPersona } from './renderUtils';
export type { TestProvidersProps } from './TestProviders';
