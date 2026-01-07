import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@/test/utils/test-utils';
import LegacyEquipmentQRRedirect from '../LegacyEquipmentQRRedirect';

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: vi.fn(),
    Navigate: ({ to }: { to: string }) => <div data-testid="navigate" data-to={to} />
  };
});

const { useParams } = await import('react-router-dom');

describe('LegacyEquipmentQRRedirect', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('redirects legacy /qr/:equipmentId to /qr/equipment/:equipmentId', () => {
    (useParams as ReturnType<typeof vi.fn>).mockReturnValue({ equipmentId: 'eq-123' });

    render(<LegacyEquipmentQRRedirect />);

    expect(screen.getByTestId('navigate')).toHaveAttribute('data-to', '/qr/equipment/eq-123');
  });
});

