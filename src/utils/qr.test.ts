import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  equipmentQRPath,
  inventoryQRPath,
  workOrderQRPath,
  operatorCheckInQRPath,
  qrFullUrl,
  parseEquipQRTarget,
} from './qr';

const LOCAL_ORIGIN = 'http://localhost:8080';

vi.mock('qrcode', () => ({
  default: {
    toDataURL: vi.fn().mockResolvedValue('data:image/png;base64,mock'),
  },
}));

describe('QR path builders', () => {
  it('builds equipment QR path without org', () => {
    expect(equipmentQRPath('eq-123')).toBe('/qr/equipment/eq-123');
  });

  it('builds equipment QR path with org ID', () => {
    expect(equipmentQRPath('eq-123', 'org-abc')).toBe('/qr/equipment/eq-123?org=org-abc');
  });

  it('percent-encodes the org ID in the equipment QR path', () => {
    expect(equipmentQRPath('eq-123', 'org abc')).toBe('/qr/equipment/eq-123?org=org%20abc');
  });

  it('builds inventory QR path', () => {
    expect(inventoryQRPath('inv-456')).toBe('/qr/inventory/inv-456');
  });

  it('builds work-order QR path', () => {
    expect(workOrderQRPath('wo-789')).toBe('/qr/work-order/wo-789');
  });

  it('builds operator check-in QR path', () => {
    expect(operatorCheckInQRPath('abc123')).toBe('/qr/operator-check-in/abc123');
  });
});

describe('parseEquipQRTarget', () => {
  it('parses relative equipment path with org', () => {
    const r = parseEquipQRTarget('/qr/equipment/eq-1?org=org%20a', LOCAL_ORIGIN);
    expect(r.ok && r.kind === 'equipment' && r.equipmentId === 'eq-1' && r.orgId === 'org a').toBe(true);
    if (r.ok && r.kind === 'equipment') {
      expect(r.path).toBe('/qr/equipment/eq-1?org=org%20a');
    }
  });

  it('parses absolute production equipment URL', () => {
    const r = parseEquipQRTarget('https://equipqr.app/qr/equipment/eq-99', LOCAL_ORIGIN);
    expect(r.ok && r.kind === 'equipment' && r.equipmentId === 'eq-99').toBe(true);
  });

  it('parses preview host equipment URL', () => {
    const r = parseEquipQRTarget('https://preview.equipqr.app/qr/equipment/eq-p', LOCAL_ORIGIN);
    expect(r.ok && r.kind === 'equipment' && r.equipmentId === 'eq-p').toBe(true);
  });

  it('parses legacy /qr/:equipmentId', () => {
    const r = parseEquipQRTarget('/qr/legacy-id', LOCAL_ORIGIN);
    expect(r.ok && r.kind === 'equipment' && r.equipmentId === 'legacy-id').toBe(true);
    if (r.ok && r.kind === 'equipment') expect(r.path).toBe('/qr/equipment/legacy-id');
  });

  it('parses operator check-in token path', () => {
    const r = parseEquipQRTarget('/qr/operator-check-in/token-abc', LOCAL_ORIGIN);
    expect(r.ok && r.kind === 'operatorCheckIn' && r.token === 'token-abc').toBe(true);
  });

  it('does not treat operator-check-in as legacy equipment id', () => {
    const r = parseEquipQRTarget('/qr/operator-check-in/token-abc', LOCAL_ORIGIN);
    expect(r.ok && r.kind === 'operatorCheckIn').toBe(true);
  });

  it('parses quick form token path (#1184)', () => {
    const r = parseEquipQRTarget('/qr/quick-form/token-qf', LOCAL_ORIGIN);
    expect(r.ok && r.kind === 'quickForm' && r.token === 'token-qf').toBe(true);
    if (r.ok && r.kind === 'quickForm') expect(r.path).toBe('/qr/quick-form/token-qf');
  });

  it('does not treat quick-form as legacy equipment id', () => {
    const r = parseEquipQRTarget('/qr/quick-form/token-qf', LOCAL_ORIGIN);
    expect(r.ok && r.kind === 'quickForm').toBe(true);
  });

  it('encodes dynamic QR route segments before building redirect paths', () => {
    const equipment = parseEquipQRTarget('/qr/equipment/eq%2Funsafe', LOCAL_ORIGIN);
    expect(equipment.ok && equipment.kind === 'equipment' && equipment.path).toBe(
      '/qr/equipment/eq%252Funsafe',
    );

    const inventory = parseEquipQRTarget('/qr/inventory/inv%2Funsafe', LOCAL_ORIGIN);
    expect(inventory.ok && inventory.kind === 'inventory' && inventory.path).toBe(
      '/qr/inventory/inv%252Funsafe',
    );

    const workOrder = parseEquipQRTarget('/qr/work-order/wo%2Funsafe', LOCAL_ORIGIN);
    expect(workOrder.ok && workOrder.kind === 'workOrder' && workOrder.path).toBe(
      '/qr/work-order/wo%252Funsafe',
    );
  });

  it('encodes legacy equipment IDs before building redirect paths', () => {
    const r = parseEquipQRTarget('/qr/legacy%2Funsafe', LOCAL_ORIGIN);
    expect(r.ok && r.kind === 'equipment' && r.path).toBe('/qr/equipment/legacy%252Funsafe');
  });

  it('parses inventory path', () => {
    const r = parseEquipQRTarget('/qr/inventory/inv-1', LOCAL_ORIGIN);
    expect(r.ok && r.kind === 'inventory' && r.itemId === 'inv-1').toBe(true);
  });

  it('parses work-order path', () => {
    const r = parseEquipQRTarget('/qr/work-order/wo-1', LOCAL_ORIGIN);
    expect(r.ok && r.kind === 'workOrder' && r.workOrderId === 'wo-1').toBe(true);
  });

  it('returns empty for whitespace-only input', () => {
    const r = parseEquipQRTarget('   ', LOCAL_ORIGIN);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('empty');
  });

  it('returns unsupported for non-qr dashboard paths', () => {
    const r = parseEquipQRTarget('/dashboard/equipment/1', LOCAL_ORIGIN);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('unsupported');
  });

  it('returns external for unknown origin', () => {
    const r = parseEquipQRTarget('https://evil.example/qr/equipment/x', LOCAL_ORIGIN);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('external');
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
    const { buildQRAsset } = await import('./qr');
    const asset = await buildQRAsset('https://test.com/qr/work-order/xyz');
    expect(asset.targetUrl).toBe('https://test.com/qr/work-order/xyz');
    expect(asset.dataUrl).toBe('data:image/png;base64,mock');
  });
});
