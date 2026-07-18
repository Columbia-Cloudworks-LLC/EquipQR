import { vi } from 'vitest';

export const mockAppToast = {
  toast: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  warning: vi.fn(),
};

vi.mock('@/hooks/useAppToast', () => ({
  useAppToast: () => mockAppToast,
}));
