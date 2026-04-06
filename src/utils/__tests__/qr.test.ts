import { describe, it, expect, vi, beforeEach } from 'vitest';
import { equipmentQRPath, inventoryQRPath, workOrderQRPath, qrFullUrl } from '../qr';

vi.mock('qrcode', () => ({
  default: {
    toDataURL: vi.fn().mockResolvedValue('data:image/png;base64,mock'),
  },
}));

describe('QR path builders', () => {
  it('builds equipment QR path', () => {
    expect(equipmentQRPath('eq-123')).toBe('/qr/equipment/eq-123');
  });

  it('builds inventory QR path', () => {
    expect(inventoryQRPath('inv-456')).toBe('/qr/inventory/inv-456');
  });

  it('builds work-order QR path', () => {
    expect(workOrderQRPath('wo-789')).toBe('/qr/work-order/wo-789');
  });
});

describe('qrFullUrl', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'location', {
      value: { origin: 'https://equipqr.app' },
      writable: true,
    });
  });

  it('prepends the current origin to a relative path', () => {
    expect(qrFullUrl('/qr/work-order/abc')).toBe('https://equipqr.app/qr/work-order/abc');
  });
});

describe('buildQRAsset', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'location', {
      value: { origin: 'https://test.com' },
      writable: true,
    });
  });

  it('returns a QRAsset with targetUrl and dataUrl', async () => {
    const { buildQRAsset } = await import('../qr');
    const asset = await buildQRAsset('https://test.com/qr/work-order/xyz');
    expect(asset.targetUrl).toBe('https://test.com/qr/work-order/xyz');
    expect(asset.dataUrl).toBe('data:image/png;base64,mock');
  });
});
