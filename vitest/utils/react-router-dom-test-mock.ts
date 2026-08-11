import { createElement, type ReactNode } from 'react';
import { vi } from 'vitest';

/** Shared `react-router-dom` mock factory: anchor `Link`, optional `useNavigate`. */
export async function createReactRouterDomTestMock(
  useNavigateImpl?: () => ReturnType<typeof import('react-router-dom').useNavigate>,
) {
  const actual = await vi.importActual<typeof import('react-router-dom')>(
    'react-router-dom',
  );
  return {
    ...actual,
    Link: ({
      to,
      children,
      ...props
    }: {
      to: string;
      children: ReactNode;
    }) => createElement('a', { href: to, ...props }, children),
    ...(useNavigateImpl ? { useNavigate: useNavigateImpl } : {}),
  };
}
