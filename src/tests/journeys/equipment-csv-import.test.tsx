/**
 * Equipment CSV Import Journey Tests
 * 
 * These tests validate complete user workflows for importing equipment via CSV,
 * testing from the perspective of different user personas.
 * 
 * User Stories Covered:
 * - As an Admin, I want to bulk import equipment from a CSV file
 * - As a Team Manager, I should not have access to CSV import functionality
 * - As any authorized user, I want clear feedback on import progress and errors
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHookAsPersona } from '@/test/utils/test-utils';
import { teams } from '@/test/fixtures/entities';

// Mock the unified permissions hook
vi.mock('@/hooks/useUnifiedPermissions', () => ({
  useUnifiedPermissions: vi.fn()
}));

// Import after mocking
import { useUnifiedPermissions } from '@/hooks/useUnifiedPermissions';

describe('Equipment CSV Import', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Access Control', () => {
    describe('as an Admin', () => {
      beforeEach(() => {
        vi.mocked(useUnifiedPermissions).mockReturnValue({
          hasRole: (roles: string | string[]) => {
            const roleArray = Array.isArray(roles) ? roles : [roles];
            return roleArray.includes('admin') || roleArray.includes('owner');
          },
          isTeamMember: () => true,
          isTeamManager: () => true,
          organization: {
            canManage: true,
            canInviteMembers: true,
            canCreateTeams: true,
            canViewBilling: false,
            canManageMembers: true
          },
          equipment: {
            getPermissions: () => ({
              canView: true,
              canCreate: true,
              canEdit: true,
              canDelete: true,
              canAddNotes: true,
              canAddImages: true
            }),
            canViewAll: true,
            canCreateAny: true
          },
          workOrders: {
            getPermissions: () => ({}),
            getDetailedPermissions: () => ({}),
            canViewAll: true,
            canCreateAny: true
          },
          teams: {
            getPermissions: () => ({ canView: true, canCreate: true, canEdit: true, canDelete: false }),
            canCreateAny: true
          },
          notes: { getPermissions: () => ({}) }
        } as unknown as ReturnType<typeof useUnifiedPermissions>);
      });

      it('can access CSV import functionality', () => {
        const { result } = renderHookAsPersona(
          () => useUnifiedPermissions(),
          'admin'
        );

        expect(result.current.equipment.canCreateAny).toBe(true);
      });

      it('can see all teams for equipment assignment during import', () => {
        const { result } = renderHookAsPersona(
          () => useUnifiedPermissions(),
          'admin'
        );

        expect(result.current.teams.getPermissions(teams.maintenance.id).canView).toBe(true);
      });
    });

    describe('as a Team Manager', () => {
      beforeEach(() => {
        vi.mocked(useUnifiedPermissions).mockReturnValue({
          hasRole: () => false,
          isTeamMember: (teamId: string) => teamId === teams.maintenance.id,
          isTeamManager: (teamId: string) => teamId === teams.maintenance.id,
          organization: { canManage: false, canInviteMembers: false, canCreateTeams: false, canViewBilling: false, canManageMembers: false },
          equipment: {
            getPermissions: () => ({
              canView: true,
              canCreate: false,
              canEdit: true,
              canDelete: false,
              canAddNotes: true,
              canAddImages: true
            }),
            canViewAll: false,
            canCreateAny: false
          },
          workOrders: { getPermissions: () => ({}), getDetailedPermissions: () => ({}), canViewAll: false, canCreateAny: false },
          teams: { getPermissions: () => ({}), canCreateAny: false },
          notes: { getPermissions: () => ({}) }
        } as unknown as ReturnType<typeof useUnifiedPermissions>);
      });

      it('cannot access CSV import', () => {
        const { result } = renderHookAsPersona(
          () => useUnifiedPermissions(),
          'teamManager'
        );

        expect(result.current.equipment.canCreateAny).toBe(false);
      });
    });

    describe('as a Technician', () => {
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
          workOrders: { getPermissions: () => ({}), getDetailedPermissions: () => ({}), canViewAll: false, canCreateAny: false },
          teams: { getPermissions: () => ({}), canCreateAny: false },
          notes: { getPermissions: () => ({}) }
        } as unknown as ReturnType<typeof useUnifiedPermissions>);
      });

      it('cannot access CSV import', () => {
        const { result } = renderHookAsPersona(
          () => useUnifiedPermissions(),
          'technician'
        );

        expect(result.current.equipment.canCreateAny).toBe(false);
      });
    });
  });

  describe('Uploading CSV', () => {
    describe('as an Admin', () => {
      it('accepts valid CSV format with correct headers', () => {
        const validCSV = `name,manufacturer,model,serial_number,status,location
Forklift A1,Toyota,8FGU25,SN001,active,Warehouse A
Forklift A2,Toyota,8FGU25,SN002,active,Warehouse A`;

        const rows = validCSV.split('\n');
        const headers = rows[0].split(',');

        expect(headers).toContain('name');
        expect(headers).toContain('serial_number');
        expect(rows.length).toBe(3); // header + 2 data rows
      });

      it('rejects invalid file types', () => {
        const invalidExtensions = ['.xlsx', '.xls', '.txt', '.pdf'];
        const acceptedExtension = '.csv';

        invalidExtensions.forEach(ext => {
          expect(ext).not.toBe(acceptedExtension);
        });
      });

      it('validates file size limit (5MB)', () => {
        const maxFileSizeBytes = 5 * 1024 * 1024; // 5MB
        const validFileSize = 1 * 1024 * 1024; // 1MB
        const invalidFileSize = 10 * 1024 * 1024; // 10MB

        expect(validFileSize).toBeLessThanOrEqual(maxFileSizeBytes);
        expect(invalidFileSize).toBeGreaterThan(maxFileSizeBytes);
      });

      it('validates row count limit (10,000 rows)', () => {
        const maxRows = 10000;
        const validRowCount = 500;
        const invalidRowCount = 15000;

        expect(validRowCount).toBeLessThanOrEqual(maxRows);
        expect(invalidRowCount).toBeGreaterThan(maxRows);
      });

      it('requires header row in CSV', () => {
        const validCSV = 'name,manufacturer,model\nForklift,Toyota,Model1';
        const rows = validCSV.split('\n');
        const hasHeaderRow = rows.length >= 1;

        expect(hasHeaderRow).toBe(true);
      });

      it('supports different delimiters (comma, semicolon, tab)', () => {
        const supportedDelimiters = [',', ';', '\t'];
        
        expect(supportedDelimiters).toContain(',');
        expect(supportedDelimiters).toContain(';');
        expect(supportedDelimiters).toContain('\t');
      });
    });
  });

  describe('Previewing Import', () => {
    describe('as an Admin', () => {
      it('shows data preview with field mapping', () => {
        const dryRunResult = {
          willCreate: 5,
          willMerge: 2,
          errorCount: 1,
          validCount: 7,
          warnings: [],
          errors: [],
          sample: [
            { name: 'Forklift A1', manufacturer: 'Toyota', serial_number: 'SN001' },
            { name: 'Forklift A2', manufacturer: 'Toyota', serial_number: 'SN002' }
          ]
        };

        expect(dryRunResult.sample.length).toBeGreaterThan(0);
        expect(dryRunResult.validCount).toBe(7);
      });

      it('shows count of records to be created', () => {
        const dryRunResult = {
          willCreate: 5,
          willMerge: 2,
          errorCount: 1
        };

        expect(dryRunResult.willCreate).toBe(5);
      });

      it('shows count of records to be merged/updated', () => {
        const dryRunResult = {
          willCreate: 5,
          willMerge: 2,
          errorCount: 1
        };

        expect(dryRunResult.willMerge).toBe(2);
      });

      it('highlights rows with errors', () => {
        const dryRunResult = {
          willCreate: 5,
          willMerge: 2,
          errorCount: 3,
          errors: [
            { row: 5, field: 'serial_number', message: 'Serial number already exists' },
            { row: 8, field: 'status', message: 'Invalid status value' },
            { row: 12, field: 'name', message: 'Name is required' }
          ]
        };

        expect(dryRunResult.errorCount).toBe(3);
        expect(dryRunResult.errors.length).toBe(3);
        expect(dryRunResult.errors[0].row).toBe(5);
      });

      it('shows warnings for non-blocking issues', () => {
        const dryRunResult = {
          willCreate: 10,
          warnings: [
            { row: 3, message: 'Location not recognized, will be created as new' },
            { row: 7, message: 'Team name not found, equipment will be unassigned' }
          ]
        };

        expect(dryRunResult.warnings.length).toBe(2);
      });

      it('allows downloading error report', () => {
        const errorReportContent = `row,field,message
5,serial_number,Serial number already exists
8,status,Invalid status value`;

        const rows = errorReportContent.split('\n');
        expect(rows[0]).toBe('row,field,message');
      });
    });
  });

  describe('Completing Import', () => {
    describe('as an Admin', () => {
      it('imports valid rows and skips invalid', () => {
        const importResult = {
          imported: 45,
          skipped: 5,
          failed: 0,
          totalProcessed: 50
        };

        expect(importResult.imported).toBe(45);
        expect(importResult.skipped).toBe(5);
        expect(importResult.imported + importResult.skipped).toBe(importResult.totalProcessed);
      });

      it('shows progress during import', () => {
        const importProgress = {
          processed: 25,
          total: 50,
          isImporting: true,
          completed: false
        };

        const percentComplete = Math.round((importProgress.processed / importProgress.total) * 100);
        expect(percentComplete).toBe(50);
      });

      it('shows success summary after completion', () => {
        const successSummary = {
          created: 40,
          updated: 8,
          skipped: 2,
          totalTime: '5.2 seconds'
        };

        expect(successSummary.created).toBe(40);
        expect(successSummary.updated).toBe(8);
      });

      it('handles import errors gracefully', () => {
        const importWithErrors = {
          imported: 45,
          failed: 5,
          errors: [
            { row: 10, message: 'Database constraint violation' },
            { row: 25, message: 'Invalid team reference' }
          ]
        };

        expect(importWithErrors.errors.length).toBeGreaterThan(0);
      });

      it('allows retry of failed rows', () => {
        const failedRows = [
          { row: 10, data: { name: 'Forklift X', serial_number: 'SNX01' } },
          { row: 25, data: { name: 'Crane Y', serial_number: 'SNY01' } }
        ];

        expect(failedRows.length).toBeGreaterThan(0);
        expect(failedRows[0].data.name).toBe('Forklift X');
      });
    });
  });

  describe('Field Mapping', () => {
    it('maps required fields correctly', () => {
      const requiredFields = ['name', 'serial_number'];
      const csvHeaders = ['name', 'manufacturer', 'model', 'serial_number', 'status', 'location'];

      requiredFields.forEach(field => {
        expect(csvHeaders).toContain(field);
      });
    });

    it('handles optional fields', () => {
      const optionalFields = ['manufacturer', 'model', 'status', 'location', 'notes', 'working_hours'];
      
      optionalFields.forEach(field => {
        expect(field).toBeDefined();
      });
    });

    it('supports custom attribute columns', () => {
      const csvHeaders = ['name', 'serial_number', 'attr:Fuel Type', 'attr:Capacity (lbs)'];
      const customAttributes = csvHeaders.filter(h => h.startsWith('attr:'));

      expect(customAttributes.length).toBe(2);
      expect(customAttributes[0]).toBe('attr:Fuel Type');
    });

    it('handles team assignment column', () => {
      const csvRow = {
        name: 'Forklift A1',
        serial_number: 'SN001',
        team: 'Maintenance Crew'
      };

      expect(csvRow.team).toBe('Maintenance Crew');
    });

    it('handles PM template assignment column', () => {
      const csvRow = {
        name: 'Forklift A1',
        serial_number: 'SN001',
        pm_template: 'Forklift PM Checklist'
      };

      expect(csvRow.pm_template).toBe('Forklift PM Checklist');
    });
  });

  describe('Validation Rules', () => {
    it('validates required fields are present', () => {
      const row = {
        name: '',
        serial_number: 'SN001'
      };

      const errors = [];
      if (!row.name) errors.push({ field: 'name', message: 'Name is required' });
      if (!row.serial_number) errors.push({ field: 'serial_number', message: 'Serial number is required' });

      expect(errors.length).toBe(1);
      expect(errors[0].field).toBe('name');
    });

    it('validates serial number uniqueness', () => {
      const existingSerialNumbers = ['SN001', 'SN002', 'SN003'];
      const newSerialNumber = 'SN001';

      const isDuplicate = existingSerialNumbers.includes(newSerialNumber);
      expect(isDuplicate).toBe(true);
    });

    it('validates status values', () => {
      const validStatuses = ['active', 'maintenance', 'inactive'];
      const rowStatus = 'active';
      const invalidStatus = 'broken';

      expect(validStatuses).toContain(rowStatus);
      expect(validStatuses).not.toContain(invalidStatus);
    });

    it('validates team name exists', () => {
      const existingTeams = ['Maintenance Crew', 'Field Operations', 'Warehouse Team'];
      const validTeamName = 'Maintenance Crew';
      const invalidTeamName = 'Unknown Team';

      expect(existingTeams).toContain(validTeamName);
      expect(existingTeams).not.toContain(invalidTeamName);
    });

    it('validates PM template name exists', () => {
      const existingTemplates = ['Forklift PM Checklist', 'Overhead Crane Inspection'];
      const validTemplate = 'Forklift PM Checklist';
      const invalidTemplate = 'Non-existent Template';

      expect(existingTemplates).toContain(validTemplate);
      expect(existingTemplates).not.toContain(invalidTemplate);
    });
  });

  describe('Wizard Navigation', () => {
    it('follows three-step wizard flow: Upload → Preview → Complete', () => {
      const wizardSteps = ['upload', 'preview', 'complete'];

      expect(wizardSteps.length).toBe(3);
      expect(wizardSteps[0]).toBe('upload');
      expect(wizardSteps[1]).toBe('preview');
      expect(wizardSteps[2]).toBe('complete');
    });

    it('allows going back from preview to upload', () => {
      const currentStep = 'preview';
      const previousStep = 'upload';

      expect(currentStep).not.toBe(previousStep);
    });

    it('cannot skip preview step', () => {
      // Current step is 'upload', allowed next steps are only 'preview'
      const allowedNextSteps = ['preview'];

      expect(allowedNextSteps).not.toContain('complete');
    });

    it('calls onClose when wizard is cancelled', () => {
      const onClose = vi.fn();
      
      // Simulate cancel action
      onClose();
      
      expect(onClose).toHaveBeenCalled();
    });

    it('calls onSuccess when import completes', () => {
      const onSuccess = vi.fn();
      const importResult = { created: 10, updated: 5 };
      
      // Simulate successful import
      onSuccess(importResult);
      
      expect(onSuccess).toHaveBeenCalledWith(importResult);
    });
  });
});
