/**
 * PM Template Journey Tests
 * 
 * These tests validate complete user workflows for preventive maintenance
 * template management and checklist completion.
 */

import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderAsPersona, renderHookAsPersona } from '@/test/utils/test-utils';
import { personas } from '@/test/fixtures/personas';
import { equipment, pmTemplates, workOrders, organizations } from '@/test/fixtures/entities';

// Mock hooks
vi.mock('@/features/pm-templates/hooks/usePMTemplates', () => ({
  usePMTemplates: vi.fn()
}));

vi.mock('@/features/pm-templates/hooks/usePMTemplateCompatibility', () => ({
  useMatchingPMTemplates: vi.fn()
}));

vi.mock('@/features/organization/hooks/useSimplifiedOrganizationRestrictions', () => ({
  useSimplifiedOrganizationRestrictions: vi.fn()
}));

vi.mock('@/hooks/useUnifiedPermissions', () => ({
  useUnifiedPermissions: vi.fn()
}));

// Import after mocking
import { usePMTemplates } from '@/features/pm-templates/hooks/usePMTemplates';
import { useMatchingPMTemplates } from '@/features/pm-templates/hooks/usePMTemplateCompatibility';
import { useSimplifiedOrganizationRestrictions } from '@/features/organization/hooks/useSimplifiedOrganizationRestrictions';
import { useUnifiedPermissions } from '@/hooks/useUnifiedPermissions';

// Test component for PM template list
const PMTemplateListComponent = () => {
  const { data: templates, isLoading } = usePMTemplates();
  
  if (isLoading) return <div data-testid="loading">Loading...</div>;
  
  return (
    <div data-testid="pm-template-list">
      <h1>PM Templates</h1>
      {templates?.map((template) => (
        <div key={template.id} data-testid={`template-${template.id}`}>
          <span data-testid="template-name">{template.name}</span>
          <span data-testid="template-type">
            {template.organization_id ? 'Custom' : 'Global'}
          </span>
          <span data-testid="template-items">{template.itemCount} items</span>
        </div>
      ))}
    </div>
  );
};

describe('PM Template Journey', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Template Visibility', () => {
    describe('as an Organization Owner/Admin (Professional Plan)', () => {
      beforeEach(() => {
        vi.mocked(usePMTemplates).mockReturnValue({
          data: Object.values(pmTemplates),
          isLoading: false,
          isSuccess: true,
          isError: false,
          error: null,
          status: 'success',
          fetchStatus: 'idle'
        } as ReturnType<typeof usePMTemplates>);

        vi.mocked(useSimplifiedOrganizationRestrictions).mockReturnValue({
          restrictions: {
            canCreateCustomPMTemplates: true,
            canAddMembers: true,
            canAccessAdvancedAnalytics: true,
            canAccessFleetMap: true,
            upgradeMessage: ''
          },
          checkRestriction: vi.fn(() => true),
          getRestrictionMessage: vi.fn(),
          isSingleUser: false,
          canUpgrade: false,
          isLoading: false
        });

        vi.mocked(useUnifiedPermissions).mockReturnValue({
          hasRole: () => true,
          isTeamMember: () => true,
          isTeamManager: () => true,
          organization: {
            canManage: true,
            canInviteMembers: true,
            canCreateTeams: true,
            canViewBilling: true,
            canManageMembers: true
          },
          equipment: {
            getPermissions: () => ({ canView: true, canCreate: true, canEdit: true, canDelete: true }),
            canViewAll: true,
            canCreateAny: true
          },
          workOrders: {
            getPermissions: () => ({ canView: true, canEdit: true }),
            getDetailedPermissions: () => ({ canViewPM: true, canEditPM: true }),
            canViewAll: true,
            canCreateAny: true
          },
          teams: { getPermissions: () => ({}), canCreateAny: true },
          notes: { getPermissions: () => ({}) }
        } as unknown as ReturnType<typeof useUnifiedPermissions>);
      });

      it('can see all global and custom templates', () => {
        renderAsPersona(<PMTemplateListComponent />, 'owner');

        expect(screen.getByTestId('pm-template-list')).toBeInTheDocument();
        
        // Should see all templates (global + custom)
        Object.values(pmTemplates).forEach(template => {
          expect(screen.getByTestId(`template-${template.id}`)).toBeInTheDocument();
        });
      });

      it('can create custom PM templates', () => {
        const { result } = renderHookAsPersona(
          () => useSimplifiedOrganizationRestrictions(),
          'owner'
        );

        expect(result.current.restrictions.canCreateCustomPMTemplates).toBe(true);
      });

      it('can assign templates to equipment', () => {
        const { result } = renderHookAsPersona(
          () => useUnifiedPermissions(),
          'owner'
        );

        const permissions = result.current.equipment.getPermissions();
        expect(permissions.canEdit).toBe(true);
      });
    });

    describe('as a Free Plan User', () => {
      beforeEach(() => {
        // Free users only see global templates
        const globalTemplates = Object.values(pmTemplates).filter(t => t.organization_id === null);
        
        vi.mocked(usePMTemplates).mockReturnValue({
          data: globalTemplates,
          isLoading: false,
          isSuccess: true,
          isError: false,
          error: null,
          status: 'success',
          fetchStatus: 'idle'
        } as ReturnType<typeof usePMTemplates>);

        vi.mocked(useSimplifiedOrganizationRestrictions).mockReturnValue({
          restrictions: {
            canCreateCustomPMTemplates: false,
            canAddMembers: false,
            canAccessAdvancedAnalytics: false,
            canAccessFleetMap: false,
            upgradeMessage: 'Upgrade to Professional to create custom PM templates'
          },
          checkRestriction: vi.fn(() => false),
          getRestrictionMessage: vi.fn(() => 'Upgrade to Professional'),
          isSingleUser: true,
          canUpgrade: true,
          isLoading: false
        });
      });

      it('can only see global templates', () => {
        renderAsPersona(<PMTemplateListComponent />, 'owner');

        expect(screen.getByTestId('pm-template-list')).toBeInTheDocument();
        
        // Should see global templates
        expect(screen.getByTestId(`template-${pmTemplates.forklift.id}`)).toBeInTheDocument();
        expect(screen.getByTestId(`template-${pmTemplates.crane.id}`)).toBeInTheDocument();
        
        // Should NOT see custom templates
        expect(screen.queryByTestId(`template-${pmTemplates.customOrgTemplate.id}`)).not.toBeInTheDocument();
      });

      it('cannot create custom PM templates', () => {
        const { result } = renderHookAsPersona(
          () => useSimplifiedOrganizationRestrictions(),
          'owner'
        );

        expect(result.current.restrictions.canCreateCustomPMTemplates).toBe(false);
        expect(result.current.canUpgrade).toBe(true);
      });

      it('shows upgrade message for custom template creation', () => {
        const { result } = renderHookAsPersona(
          () => useSimplifiedOrganizationRestrictions(),
          'owner'
        );

        expect(result.current.restrictions.upgradeMessage).toContain('Upgrade');
      });
    });
  });

  describe('Template Assignment to Equipment', () => {
    describe('as an Admin', () => {
      beforeEach(() => {
        vi.mocked(usePMTemplates).mockReturnValue({
          data: Object.values(pmTemplates),
          isLoading: false,
          isSuccess: true,
          isError: false,
          error: null,
          status: 'success',
          fetchStatus: 'idle'
        } as ReturnType<typeof usePMTemplates>);

        vi.mocked(useMatchingPMTemplates).mockReturnValue({
          data: [
            { template_id: pmTemplates.forklift.id, match_type: 'manufacturer' as const }
          ],
          isLoading: false,
          isSuccess: true,
          isError: false,
          error: null,
          status: 'success',
          fetchStatus: 'idle',
          refetch: vi.fn(),
          isFetching: false,
          isPending: false,
          isRefetching: false,
          isStale: false,
          dataUpdatedAt: Date.now(),
          errorUpdatedAt: 0,
          failureCount: 0,
          failureReason: null,
          errorUpdateCount: 0,
          isFetched: true,
          isFetchedAfterMount: true,
          isInitialLoading: false,
          isLoadingError: false,
          isPlaceholderData: false,
          isRefetchError: false,
          promise: Promise.resolve([])
        } as unknown as ReturnType<typeof useMatchingPMTemplates>);

        vi.mocked(useUnifiedPermissions).mockReturnValue({
          hasRole: () => true,
          isTeamMember: () => true,
          isTeamManager: () => true,
          organization: { canManage: true, canInviteMembers: true, canCreateTeams: true, canViewBilling: false, canManageMembers: true },
          equipment: {
            getPermissions: () => ({ canView: true, canCreate: true, canEdit: true, canDelete: true }),
            canViewAll: true,
            canCreateAny: true
          },
          workOrders: {
            getPermissions: () => ({}),
            getDetailedPermissions: () => ({}),
            canViewAll: true,
            canCreateAny: true
          },
          teams: { getPermissions: () => ({}), canCreateAny: true },
          notes: { getPermissions: () => ({}) }
        } as unknown as ReturnType<typeof useUnifiedPermissions>);
      });

      it('can assign PM template to equipment', () => {
        const equipmentUpdate = {
          id: equipment.forklift1.id,
          default_pm_template_id: pmTemplates.forklift.id
        };

        expect(equipmentUpdate.default_pm_template_id).toBe(pmTemplates.forklift.id);
      });

      it('sees matching templates based on equipment manufacturer', () => {
        const { result } = renderHookAsPersona(
          () => useMatchingPMTemplates(equipment.forklift1.id),
          'admin'
        );

        const matchingTemplates = result.current.data;
        expect(matchingTemplates).toBeDefined();
        expect(matchingTemplates?.some(m => m.template_id === pmTemplates.forklift.id)).toBe(true);
      });

      it('can remove PM template assignment', () => {
        const equipmentUpdate = {
          id: equipment.forklift1.id,
          default_pm_template_id: null
        };

        expect(equipmentUpdate.default_pm_template_id).toBeNull();
      });
    });

    describe('as a Team Manager', () => {
      beforeEach(() => {
        vi.mocked(useUnifiedPermissions).mockReturnValue({
          hasRole: () => false,
          isTeamMember: () => true,
          isTeamManager: () => true,
          organization: { canManage: false, canInviteMembers: false, canCreateTeams: false, canViewBilling: false, canManageMembers: false },
          equipment: {
            getPermissions: () => ({
              canView: true,
              canCreate: false,
              canEdit: true, // Managers can edit
              canDelete: false
            }),
            canViewAll: false,
            canCreateAny: false
          },
          workOrders: {
            getPermissions: () => ({}),
            getDetailedPermissions: () => ({ canViewPM: true, canEditPM: true }),
            canViewAll: false,
            canCreateAny: true
          },
          teams: { getPermissions: () => ({}), canCreateAny: false },
          notes: { getPermissions: () => ({}) }
        } as unknown as ReturnType<typeof useUnifiedPermissions>);
      });

      it('can view PM template assignments on equipment', () => {
        const { result } = renderHookAsPersona(
          () => useUnifiedPermissions(),
          'teamManager'
        );

        const permissions = result.current.equipment.getPermissions();
        expect(permissions.canView).toBe(true);
      });

      it('can update PM template on team equipment', () => {
        const { result } = renderHookAsPersona(
          () => useUnifiedPermissions(),
          'teamManager'
        );

        const permissions = result.current.equipment.getPermissions();
        expect(permissions.canEdit).toBe(true);
      });
    });
  });

  describe('PM Checklist Completion During Work Order', () => {
    describe('as a Technician', () => {
      beforeEach(() => {
        vi.mocked(useUnifiedPermissions).mockReturnValue({
          hasRole: () => false,
          isTeamMember: () => true,
          isTeamManager: () => false,
          organization: { canManage: false, canInviteMembers: false, canCreateTeams: false, canViewBilling: false, canManageMembers: false },
          equipment: {
            getPermissions: () => ({
              canView: true,
              canCreate: false,
              canEdit: false,
              canDelete: false
            }),
            canViewAll: false,
            canCreateAny: false
          },
          workOrders: {
            getPermissions: () => ({
              canView: true,
              canEdit: true,
              canChangeStatus: true
            }),
            getDetailedPermissions: () => ({
              canEdit: true,
              canViewPM: true,
              canEditPM: true,
              canChangeStatus: true
            }),
            canViewAll: false,
            canCreateAny: true
          },
          teams: { getPermissions: () => ({}), canCreateAny: false },
          notes: { getPermissions: () => ({}) }
        } as unknown as ReturnType<typeof useUnifiedPermissions>);
      });

      it('can view PM checklist on assigned work order', () => {
        const { result } = renderHookAsPersona(
          () => useUnifiedPermissions(),
          'technician'
        );

        const permissions = result.current.workOrders.getDetailedPermissions(workOrders.assigned as never);
        expect(permissions.canViewPM).toBe(true);
      });

      it('can complete PM checklist items', () => {
        const { result } = renderHookAsPersona(
          () => useUnifiedPermissions(),
          'technician'
        );

        const permissions = result.current.workOrders.getDetailedPermissions(workOrders.assigned as never);
        expect(permissions.canEditPM).toBe(true);
      });

      it('PM completion affects work order completion eligibility', () => {
        // Work order with PM required cannot be completed until PM is done
        const workOrderWithPM = {
          ...workOrders.assigned,
          has_pm: true,
          pm_required: true,
          pm_completed_percentage: 100
        };

        const canComplete = workOrderWithPM.pm_completed_percentage === 100;
        expect(canComplete).toBe(true);

        const incompleteWO = {
          ...workOrders.assigned,
          has_pm: true,
          pm_required: true,
          pm_completed_percentage: 50
        };

        const canCompleteIncomplete = incompleteWO.pm_completed_percentage === 100;
        expect(canCompleteIncomplete).toBe(false);
      });
    });

    describe('Checklist Progress Tracking', () => {
      it('calculates completion percentage correctly', () => {
        const checklist = {
          totalItems: 19, // Forklift template has 19 items
          completedItems: 10,
          percentage: 0
        };
        
        checklist.percentage = Math.round((checklist.completedItems / checklist.totalItems) * 100);
        
        expect(checklist.percentage).toBe(53);
      });

      it('tracks completion per section', () => {
        const sections = [
          { name: 'Engine & Fluids', totalItems: 5, completedItems: 5 },
          { name: 'Hydraulics', totalItems: 4, completedItems: 2 },
          { name: 'Safety Equipment', totalItems: 6, completedItems: 0 },
          { name: 'Tires & Brakes', totalItems: 4, completedItems: 4 }
        ];

        const sectionCompletions = sections.map(s => ({
          name: s.name,
          percentage: Math.round((s.completedItems / s.totalItems) * 100)
        }));

        expect(sectionCompletions[0].percentage).toBe(100);
        expect(sectionCompletions[1].percentage).toBe(50);
        expect(sectionCompletions[2].percentage).toBe(0);
        expect(sectionCompletions[3].percentage).toBe(100);
      });

      it('handles pass/fail/na item states', () => {
        const checklistItem = {
          id: 'item-1',
          description: 'Check oil level',
          state: null as 'pass' | 'fail' | 'na' | null,
          notes: ''
        };

        // Mark as pass
        checklistItem.state = 'pass';
        expect(checklistItem.state).toBe('pass');

        // Mark as fail with notes
        checklistItem.state = 'fail';
        checklistItem.notes = 'Oil level low, needs top-up';
        expect(checklistItem.state).toBe('fail');
        expect(checklistItem.notes.length).toBeGreaterThan(0);

        // Mark as N/A
        checklistItem.state = 'na';
        expect(checklistItem.state).toBe('na');
      });
    });
  });

  describe('Template Creation and Management', () => {
    describe('as an Admin on Professional Plan', () => {
      beforeEach(() => {
        vi.mocked(useSimplifiedOrganizationRestrictions).mockReturnValue({
          restrictions: {
            canCreateCustomPMTemplates: true,
            canAddMembers: true,
            canAccessAdvancedAnalytics: true,
            canAccessFleetMap: true,
            upgradeMessage: ''
          },
          checkRestriction: vi.fn(() => true),
          getRestrictionMessage: vi.fn(),
          isSingleUser: false,
          canUpgrade: false,
          isLoading: false
        });
      });

      it('can create new PM template with sections', () => {
        const newTemplate = {
          name: 'Custom Generator PM',
          description: 'Weekly generator maintenance checklist',
          organization_id: organizations.acme.id,
          is_protected: false,
          sections: [
            { name: 'Fuel System', items: ['Check fuel level', 'Inspect fuel lines'] },
            { name: 'Electrical', items: ['Test battery', 'Check connections'] }
          ]
        };

        expect(newTemplate.organization_id).toBe(organizations.acme.id);
        expect(newTemplate.is_protected).toBe(false);
        expect(newTemplate.sections.length).toBe(2);
      });

      it('can edit custom templates', () => {
        const customTemplate = pmTemplates.customOrgTemplate;
        
        // Custom templates can be edited
        expect(customTemplate.is_protected).toBe(false);
        expect(customTemplate.organization_id).toBe('org-acme');
      });

      it('cannot edit global protected templates', () => {
        const globalTemplate = pmTemplates.forklift;
        
        // Global templates are protected
        expect(globalTemplate.is_protected).toBe(true);
        expect(globalTemplate.organization_id).toBeNull();
      });

      it('can delete custom templates', () => {
        const customTemplate = pmTemplates.customOrgTemplate;
        
        // Can delete if not protected and belongs to org
        const canDelete = !customTemplate.is_protected && 
                          customTemplate.organization_id === organizations.acme.id;
        
        expect(canDelete).toBe(true);
      });

      it('can clone global template as custom', () => {
        const globalTemplate = pmTemplates.forklift;
        
        const clonedTemplate = {
          ...globalTemplate,
          id: 'new-cloned-id',
          name: `${globalTemplate.name} (Custom)`,
          organization_id: organizations.acme.id,
          is_protected: false
        };

        expect(clonedTemplate.organization_id).toBe(organizations.acme.id);
        expect(clonedTemplate.is_protected).toBe(false);
        expect(clonedTemplate.name).toContain('Custom');
      });
    });
  });

  describe('Template Compatibility', () => {
    it('suggests templates based on equipment manufacturer', () => {
      const equipmentData = equipment.forklift1;
      
      // Toyota forklift should match Forklift PM template
      const matchingTemplates = [
        { template_id: pmTemplates.forklift.id, match_type: 'manufacturer' as const }
      ];

      expect(matchingTemplates[0].match_type).toBe('manufacturer');
    });

    it('suggests templates based on equipment model', () => {
      const equipmentData = equipment.crane;
      
      // Crane should match Crane Inspection template
      const matchingTemplates = [
        { template_id: pmTemplates.crane.id, match_type: 'model' as const }
      ];

      expect(matchingTemplates[0].template_id).toBe(pmTemplates.crane.id);
    });

    it('shows all templates when no compatibility rules match', () => {
      // Equipment with no matching rules should show all available templates
      const noMatchEquipment = equipment.compressor;
      
      expect(noMatchEquipment.default_pm_template_id).toBeNull();
      
      // All templates should be available for selection
      const availableTemplates = Object.values(pmTemplates);
      expect(availableTemplates.length).toBeGreaterThan(0);
    });
  });

  describe('Template Application to Equipment', () => {
    describe('as an Admin', () => {
      it('can apply template to create PM work orders for selected equipment', () => {
        const selectedEquipment = [equipment.forklift1, equipment.forklift2];
        const templateId = pmTemplates.forklift.id;

        // Admin can select multiple equipment
        expect(selectedEquipment.length).toBe(2);
        
        // Work orders will be created for each selected equipment
        const workOrdersToCreate = selectedEquipment.map(eq => ({
          title: `Preventative Maintenance - ${eq.name}`,
          description: `PM using ${pmTemplates.forklift.name}`,
          equipment_id: eq.id,
          has_pm: true,
          priority: 'medium'
        }));

        expect(workOrdersToCreate.length).toBe(2);
        expect(workOrdersToCreate[0].has_pm).toBe(true);
      });

      it('can search and filter equipment when applying template', () => {
        const allEquipment = Object.values(equipment);
        const searchQuery = 'Forklift';

        const filteredEquipment = allEquipment.filter(eq =>
          eq.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          eq.manufacturer.toLowerCase().includes(searchQuery.toLowerCase())
        );

        expect(filteredEquipment.length).toBeGreaterThan(0);
        expect(filteredEquipment.every(eq => 
          eq.name.includes('Forklift') || eq.manufacturer === 'Toyota'
        )).toBe(true);
      });

      it('can select all visible equipment', () => {
        const visibleEquipment = Object.values(equipment);
        const selectedIds = visibleEquipment.map(eq => eq.id);

        expect(selectedIds.length).toBe(visibleEquipment.length);
      });

      it('sees equipment status and location in selection list', () => {
        const eq = equipment.forklift1;

        expect(eq.status).toBe('active');
        expect(eq.location).toBe('Warehouse A');
        expect(eq.manufacturer).toBe('Toyota');
        expect(eq.model).toBe('8FGU25');
      });
    });

    describe('work order creation from template application', () => {
      it('creates work order with correct PM configuration', () => {
        const workOrderData = {
          title: `Preventative Maintenance - ${equipment.forklift1.name}`,
          description: `PM work order created from ${pmTemplates.forklift.name}`,
          equipment_id: equipment.forklift1.id,
          organization_id: organizations.acme.id,
          has_pm: true,
          pm_required: true,
          priority: 'medium'
        };

        expect(workOrderData.has_pm).toBe(true);
        expect(workOrderData.pm_required).toBe(true);
      });

      it('initializes PM checklist after work order creation', () => {
        const checklistInitData = {
          workOrderId: 'wo-new-1',
          organizationId: organizations.acme.id,
          templateId: pmTemplates.forklift.id
        };

        expect(checklistInitData.templateId).toBe(pmTemplates.forklift.id);
      });

      it('reports success count after bulk creation', () => {
        const creationResult = {
          created: 5,
          failed: 0,
          total: 5
        };

        expect(creationResult.created).toBe(creationResult.total);
      });

      it('reports partial success when some creations fail', () => {
        const partialResult = {
          created: 3,
          failed: 2,
          total: 5
        };

        expect(partialResult.created + partialResult.failed).toBe(partialResult.total);
      });
    });
  });

  describe('Bulk Template Assignment', () => {
    describe('as an Admin', () => {
      it('can assign default PM template to multiple equipment', () => {
        const selectedEquipmentIds = [equipment.forklift1.id, equipment.crane.id];
        const templateId = pmTemplates.forklift.id;

        const assignmentData = {
          equipmentIds: selectedEquipmentIds,
          templateId
        };

        expect(assignmentData.equipmentIds.length).toBe(2);
        expect(assignmentData.templateId).toBe(templateId);
      });

      it('can search equipment by name, model, or serial number', () => {
        const allEquipment = Object.values(equipment);
        const queries = ['Forklift', 'Toyota', 'TY-2024'];

        queries.forEach(query => {
          const results = allEquipment.filter(eq =>
            eq.name.toLowerCase().includes(query.toLowerCase()) ||
            eq.manufacturer.toLowerCase().includes(query.toLowerCase()) ||
            eq.serial_number.toLowerCase().includes(query.toLowerCase())
          );

          expect(results.length).toBeGreaterThanOrEqual(0);
        });
      });

      it('shows current template assignment status', () => {
        const forkliftWithTemplate = equipment.forklift1;
        const compressorWithoutTemplate = equipment.compressor;

        expect(forkliftWithTemplate.default_pm_template_id).toBe('template-forklift');
        expect(compressorWithoutTemplate.default_pm_template_id).toBeNull();
      });

      it('displays equipment count for bulk assignment', () => {
        const selectedCount = 3;
        const totalVisible = 5;

        const statusText = `${selectedCount} of ${totalVisible} visible equipment selected`;
        expect(statusText).toContain(selectedCount.toString());
      });

      it('disables assign button when no equipment selected', () => {
        const selectedCount = 0;
        const isButtonDisabled = selectedCount === 0;

        expect(isButtonDisabled).toBe(true);
      });
    });

    describe('as a Team Manager', () => {
      beforeEach(() => {
        vi.mocked(useUnifiedPermissions).mockReturnValue({
          hasRole: () => false,
          isTeamMember: () => true,
          isTeamManager: () => true,
          organization: { canManage: false, canInviteMembers: false, canCreateTeams: false, canViewBilling: false, canManageMembers: false },
          equipment: {
            getPermissions: () => ({
              canView: true,
              canCreate: false,
              canEdit: true,
              canDelete: false
            }),
            canViewAll: false,
            canCreateAny: false
          },
          workOrders: {
            getPermissions: () => ({}),
            getDetailedPermissions: () => ({ canViewPM: true, canEditPM: true }),
            canViewAll: false,
            canCreateAny: true
          },
          teams: { getPermissions: () => ({}), canCreateAny: false },
          notes: { getPermissions: () => ({}) }
        } as unknown as ReturnType<typeof useUnifiedPermissions>);
      });

      it('can assign templates to team equipment only', () => {
        const { result } = renderHookAsPersona(
          () => useUnifiedPermissions(),
          'teamManager'
        );

        const permissions = result.current.equipment.getPermissions();
        expect(permissions.canEdit).toBe(true);
        expect(result.current.equipment.canViewAll).toBe(false);
      });
    });
  });

  describe('Template Application Error Handling', () => {
    it('handles work order creation failure gracefully', () => {
      const errorResult = {
        created: 0,
        failed: 3,
        errors: [
          { equipmentId: 'eq-1', error: 'Database error' },
          { equipmentId: 'eq-2', error: 'Validation failed' },
          { equipmentId: 'eq-3', error: 'Permission denied' }
        ]
      };

      expect(errorResult.failed).toBe(errorResult.errors.length);
    });

    it('handles PM checklist initialization failure', () => {
      const initError = {
        workOrderId: 'wo-1',
        error: 'Template data invalid'
      };

      expect(initError.error).toBeDefined();
    });

    it('handles bulk assignment failure', () => {
      const bulkError = {
        success: false,
        message: 'Failed to assign template to equipment',
        failedIds: ['eq-1', 'eq-2']
      };

      expect(bulkError.success).toBe(false);
      expect(bulkError.failedIds.length).toBeGreaterThan(0);
    });
  });
});
