// Re-export testing library functions
export * from '@testing-library/react';
// Re-export custom render
export { customRender as render } from './renderUtils';

// Re-export persona utilities
export { renderAsPersona, renderHookAsPersona } from './renderUtils';
export { createPersonaWrapper, TestProviders } from './TestProviders';
export type { TestProvidersProps } from './TestProviders';
