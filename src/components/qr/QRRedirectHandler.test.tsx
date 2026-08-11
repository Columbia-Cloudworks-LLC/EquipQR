import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QRRedirectHandler } from '@/components/qr/QRRedirectHandler';

const triggerFeedback = vi.fn();

vi.mock('@/hooks/useScanFeedback', () => ({
  useScanFeedback: () => ({
    prepareFeedback: vi.fn(),
    markPendingFeedback: vi.fn(),
    triggerFeedback,
    triggerPendingFeedback: triggerFeedback,
  }),
}));

let capturedOnComplete: ((path: string) => void) | undefined;

vi.mock('@/hooks/useQRRedirectWithOrgSwitch', () => ({
  useQRRedirectWithOrgSwitch: (opts: { onComplete?: (path: string) => void }) => {
    capturedOnComplete = opts.onComplete;
    return {
      state: {
        isLoading: false,
        needsAuth: false,
        needsOrgSwitch: false,
        canProceed: true,
        error: null,
        equipmentInfo: null,
        inventoryInfo: null,
        workOrderInfo: null,
        targetPath: '/dashboard/equipment/x?qr=true',
      },
      isSwitchingOrg: false,
      handleOrgSwitch: vi.fn(),
      retry: vi.fn(),
    };
  },
}));

describe('QRRedirectHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedOnComplete = undefined;
  });

  it('calls triggerFeedback when onComplete runs', () => {
    render(
      <MemoryRouter>
        <QRRedirectHandler equipmentId="eq-1" />
      </MemoryRouter>
    );

    act(() => {
      capturedOnComplete?.('/dashboard/equipment/eq-1?qr=true');
    });

    expect(triggerFeedback).toHaveBeenCalledTimes(1);
  });
});
