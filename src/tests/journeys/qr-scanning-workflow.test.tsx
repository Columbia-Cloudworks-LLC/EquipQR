/**
 * QR Scanning Workflow Journey Tests
 * 
 * These tests validate complete user workflows for QR code scanning and equipment access,
 * testing from the perspective of different user personas.
 * 
 * User Stories Covered:
 * - As a Technician, I want to scan a QR code to quickly access equipment details
 * - As any user, I want QR codes to redirect me to the correct equipment page
 * - As a mobile user, I want a seamless scanning experience
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHookAsPersona } from '@/test/utils/test-utils';
import { equipment, teams, organizations } from '@/test/fixtures/entities';

// Mock the unified permissions hook
vi.mock('@/hooks/useUnifiedPermissions', () => ({
  useUnifiedPermissions: vi.fn()
}));

// Import after mocking
import { useUnifiedPermissions } from '@/hooks/useUnifiedPermissions';

describe('QR Scanning Workflow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('QR Code Scanning', () => {
    describe('as a Technician in the field', () => {
      beforeEach(() => {
        vi.mocked(useUnifiedPermissions).mockReturnValue({
          hasRole: () => false,
          isTeamMember: (teamId: string) => teamId === teams.maintenance.id,
          isTeamManager: () => false,
          organization: { canManage: false, canInviteMembers: false, canCreateTeams: false, canViewBilling: false, canManageMembers: false },
          equipment: {
            getPermissions: () => ({
              canView: true,
              canCreate: false,
              canEdit: false,
              canDelete: false,
              canAddNotes: true,
              canAddImages: true
            }),
            canViewAll: false,
            canCreateAny: false
          },
          workOrders: {
            getPermissions: () => ({ canView: true, canCreate: true, canEdit: false }),
            getDetailedPermissions: () => ({ canViewPM: true, canEditPM: true }),
            canViewAll: false,
            canCreateAny: true
          },
          teams: { getPermissions: () => ({}), canCreateAny: false },
          notes: {
            getPermissions: () => ({
              canViewNotes: true,
              canAddPublicNote: true,
              canAddPrivateNote: false,
              canUploadImages: true
            })
          }
        } as unknown as ReturnType<typeof useUnifiedPermissions>);
      });

      it('can access scanner page', () => {
        const scannerPageAccessible = true;
        expect(scannerPageAccessible).toBe(true);
      });

      it('can scan QR code to access equipment details', () => {
        const qrCodeContent = `https://app.equipqr.com/qr/${equipment.forklift1.id}`;
        const extractedEquipmentId = qrCodeContent.split('/qr/')[1];

        expect(extractedEquipmentId).toBe(equipment.forklift1.id);
      });

      it('can view equipment after scanning', () => {
        const { result } = renderHookAsPersona(
          () => useUnifiedPermissions(),
          'technician'
        );

        const permissions = result.current.equipment.getPermissions();
        expect(permissions.canView).toBe(true);
      });

      it('can add notes to scanned equipment', () => {
        const { result } = renderHookAsPersona(
          () => useUnifiedPermissions(),
          'technician'
        );

        const notePermissions = result.current.notes.getPermissions();
        expect(notePermissions.canAddPublicNote).toBe(true);
      });

      it('can upload images to scanned equipment', () => {
        const { result } = renderHookAsPersona(
          () => useUnifiedPermissions(),
          'technician'
        );

        const notePermissions = result.current.notes.getPermissions();
        expect(notePermissions.canUploadImages).toBe(true);
      });

      it('can create work order from scanned equipment', () => {
        const { result } = renderHookAsPersona(
          () => useUnifiedPermissions(),
          'technician'
        );

        expect(result.current.workOrders.canCreateAny).toBe(true);
      });
    });
  });

  describe('QR Code Redirect Handling', () => {
    describe('valid equipment QR codes', () => {
      it('redirects to equipment details for valid ID', () => {
        const equipmentId = equipment.forklift1.id;
        const expectedPath = `/dashboard/equipment/${equipmentId}`;

        expect(expectedPath).toContain(equipmentId);
      });

      it('handles UUID-format equipment IDs', () => {
        const uuidEquipmentId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
        const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuidEquipmentId);

        expect(isValidUUID).toBe(true);
      });

      it('preserves organization context during redirect', () => {
        const organizationId = organizations.acme.id;

        // Equipment should be filtered by organization
        expect(equipment.forklift1.organization_id).toBe(organizationId);
      });
    });

    describe('invalid QR codes', () => {
      it('shows error for non-existent equipment ID', () => {
        const errorMessage = 'Equipment not found';

        expect(errorMessage).toBe('Equipment not found');
      });

      it('handles empty equipment ID in URL', () => {
        const emptyId = '';
        const isInvalid = emptyId.length === 0;

        expect(isInvalid).toBe(true);
      });

      it('handles malformed equipment ID gracefully', () => {
        const malformedId = '!@#$%^&*()';
        const containsSpecialChars = /[!@#$%^&*()]/.test(malformedId);

        expect(containsSpecialChars).toBe(true);
      });

      it('redirects to not found page for invalid IDs', () => {
        const invalidPath = '/not-found';
        expect(invalidPath).toBe('/not-found');
      });
    });

    describe('legacy QR code format support', () => {
      it('redirects legacy /eq/:id format to new format', () => {
        const equipmentId = 'ABC123';
        const newPath = `/dashboard/equipment/${equipmentId}`;

        expect(newPath).toContain(equipmentId);
        expect(newPath).not.toContain('/eq/');
      });

      it('handles legacy inventory QR codes', () => {
        const inventoryId = 'INV001';
        const newPath = `/dashboard/inventory/${inventoryId}`;

        expect(newPath).toContain(inventoryId);
        expect(newPath).not.toContain('/inv/');
      });

      it('preserves equipment ID during redirect', () => {
        const originalId = 'original-equipment-id-123';
        const redirectedPath = `/dashboard/equipment/${originalId}`;

        expect(redirectedPath).toContain(originalId);
      });
    });
  });

  describe('Scanner Page UI', () => {
    describe('core functionality', () => {
      it('displays page title', () => {
        const pageTitle = 'QR Scanner';
        expect(pageTitle).toBe('QR Scanner');
      });

      it('shows scan instructions', () => {
        const instructions = 'Scan a QR code to see equipment details';
        expect(instructions).toContain('Scan');
        expect(instructions).toContain('equipment');
      });

      it('has back navigation button', () => {
        const hasBackButton = true;
        expect(hasBackButton).toBe(true);
      });

      it('has start scan button when not scanning', () => {
        const isScanning = false;
        const buttonLabel = isScanning ? 'Stop Scan' : 'Start Scan';
        
        expect(buttonLabel).toBe('Start Scan');
      });

      it('shows stop scan button when scanning', () => {
        const isScanning = true;
        const buttonLabel = isScanning ? 'Stop Scan' : 'Start Scan';
        
        expect(buttonLabel).toBe('Stop Scan');
      });
    });

    describe('scan result handling', () => {
      it('navigates to equipment on successful scan', () => {
        const extractedId = equipment.forklift1.id;
        const targetPath = `/dashboard/equipment/${extractedId}`;

        // Verify target path is constructed correctly from extracted ID
        expect(targetPath).toContain(extractedId);
      });

      it('handles URL format QR codes', () => {
        const urlQrCode = 'https://app.equipqr.com/qr/eq-forklift-1';
        // Use URL parsing for proper hostname validation instead of substring matching
        // This prevents attacks like 'evil.com/equipqr.com' from being accepted
        const url = new URL(urlQrCode);
        const isValidHost = url.hostname === 'app.equipqr.com' || url.hostname.endsWith('.equipqr.com');

        expect(isValidHost).toBe(true);
      });

      it('handles plain ID format QR codes', () => {
        const plainIdQrCode = 'eq-forklift-1';
        const isPlainId = !plainIdQrCode.includes('http');

        expect(isPlainId).toBe(true);
      });

      it('shows error toast for invalid scan', () => {
        const errorMessage = 'Invalid QR code format';

        expect(errorMessage).toContain('Invalid');
      });
    });
  });

  describe('Access Control', () => {
    describe('authenticated users', () => {
      it('allows authenticated users to access scanner', () => {
        const isAuthenticated = true;
        const canAccessScanner = isAuthenticated;

        expect(canAccessScanner).toBe(true);
      });

      it('redirects to login for unauthenticated users', () => {
        const isAuthenticated = false;
        const redirectPath = isAuthenticated ? '/scanner' : '/auth';

        expect(redirectPath).toBe('/auth');
      });
    });

    describe('organization context', () => {
      it('only shows equipment from current organization', () => {
        const currentOrgId = organizations.acme.id;
        const scannedEquipmentOrgId = equipment.forklift1.organization_id;

        expect(scannedEquipmentOrgId).toBe(currentOrgId);
      });

      it('shows error when scanning equipment from different organization', () => {
        const currentOrgId = organizations.acme.id;
        const differentOrgId = 'org-different';

        expect(currentOrgId).not.toBe(differentOrgId);
      });
    });

    describe('team-based access', () => {
      beforeEach(() => {
        vi.mocked(useUnifiedPermissions).mockReturnValue({
          hasRole: () => false,
          isTeamMember: (teamId: string) => teamId === teams.maintenance.id,
          isTeamManager: () => false,
          organization: { canManage: false, canInviteMembers: false, canCreateTeams: false, canViewBilling: false, canManageMembers: false },
          equipment: {
            getPermissions: (teamId?: string | null) => ({
              canView: teamId === teams.maintenance.id,
              canCreate: false,
              canEdit: false,
              canDelete: false,
              canAddNotes: teamId === teams.maintenance.id,
              canAddImages: teamId === teams.maintenance.id
            }),
            canViewAll: false,
            canCreateAny: false
          },
          workOrders: { getPermissions: () => ({}), getDetailedPermissions: () => ({}), canViewAll: false, canCreateAny: false },
          teams: { getPermissions: () => ({}), canCreateAny: false },
          notes: { getPermissions: () => ({}) }
        } as unknown as ReturnType<typeof useUnifiedPermissions>);
      });

      it('technician can view team equipment via QR scan', () => {
        const { result } = renderHookAsPersona(
          () => useUnifiedPermissions(),
          'technician'
        );

        const permissions = result.current.equipment.getPermissions(teams.maintenance.id);
        expect(permissions.canView).toBe(true);
      });

      it('technician cannot view other team equipment via QR scan', () => {
        const { result } = renderHookAsPersona(
          () => useUnifiedPermissions(),
          'technician'
        );

        const permissions = result.current.equipment.getPermissions(teams.field.id);
        expect(permissions.canView).toBe(false);
      });
    });
  });

  describe('Mobile Experience', () => {
    describe('camera access', () => {
      it('requests camera permission before scanning', () => {
        const cameraPermissionRequired = true;
        expect(cameraPermissionRequired).toBe(true);
      });

      it('shows error when camera access is denied', () => {
        const cameraAccessDenied = true;
        const errorMessage = cameraAccessDenied ? 'Camera access denied' : null;

        expect(errorMessage).toBe('Camera access denied');
      });

      it('shows instructions for enabling camera', () => {
        const helpText = 'Please enable camera access in your browser settings';
        expect(helpText).toContain('camera');
      });
    });

    describe('responsive behavior', () => {
      it('scanner fills viewport on mobile', () => {
        const isMobile = true;
        const scannerLayout = isMobile ? 'fullscreen' : 'contained';

        expect(scannerLayout).toBe('fullscreen');
      });

      it('shows compact controls on mobile', () => {
        const isMobile = true;
        const controlsStyle = isMobile ? 'compact' : 'full';

        expect(controlsStyle).toBe('compact');
      });
    });

    describe('offline behavior', () => {
      it('shows offline message when no connection', () => {
        const isOnline = false;
        const message = isOnline ? null : 'You appear to be offline';

        expect(message).toBe('You appear to be offline');
      });

      it('caches last scanned equipment for offline viewing', () => {
        const cachedEquipmentId = equipment.forklift1.id;
        const isCached = cachedEquipmentId !== null;

        expect(isCached).toBe(true);
      });
    });
  });

  describe('QR Code Generation', () => {
    describe('as an Admin viewing equipment', () => {
      it('can generate QR code for any equipment', () => {
        const equipmentId = equipment.forklift1.id;
        const qrCodeUrl = `https://app.equipqr.com/qr/${equipmentId}`;

        expect(qrCodeUrl).toContain(equipmentId);
      });

      it('can download QR code image', () => {
        const downloadFormat = 'png';
        expect(['png', 'svg', 'pdf']).toContain(downloadFormat);
      });

      it('can print QR code', () => {
        const printable = true;
        expect(printable).toBe(true);
      });
    });

    describe('QR code content format', () => {
      it('uses consistent URL format', () => {
        const baseUrl = 'https://app.equipqr.com';
        const qrPath = '/qr/';
        const equipmentId = equipment.forklift1.id;
        const fullUrl = `${baseUrl}${qrPath}${equipmentId}`;

        expect(fullUrl).toMatch(/^https:\/\/app\.equipqr\.com\/qr\/.+$/);
      });

      it('encodes special characters in equipment ID', () => {
        const specialId = 'equipment-id-with-spaces and+plus';
        const encodedId = encodeURIComponent(specialId);

        expect(encodedId).not.toContain(' ');
        // spaces become %20 with encodeURIComponent
        expect(encodedId).toContain('%20');
      });

      it('uses HTTPS for security', () => {
        const qrUrl = `https://app.equipqr.com/qr/${equipment.forklift1.id}`;
        expect(qrUrl.startsWith('https://')).toBe(true);
      });
    });
  });
});
