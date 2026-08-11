import { describe, expect, it } from 'vitest';
import {
  buildEquipmentPdfInput,
  buildMobileEquipmentSummary,
  buildMobileWorkOrderAssigneeSummary,
  buildMobileWorkOrderSummary,
  buildOfflineSyncState,
  buildWorkOrderAssigneeSummary,
  buildWorkOrderPdfInput,
  buildWorkOrderTeamSummary,
  getMobileWorkOrderDetailsBottomPaddingClass,
  isFooterRoleEligible,
  shouldHideInlineNoteAddButton,
  shouldShowMobileSyncBanner,
  MOBILE_WO_FAB_BOTTOM_CLASS,
  shouldShowMobileActionFooter,
} from './workOrderDetailsViewModel';

describe('workOrderDetailsViewModel', () => {
  describe('isFooterRoleEligible', () => {
    it('returns true for managers', () => {
      expect(
        isFooterRoleEligible({
          permissionLevels: { isManager: true, isTechnician: false },
          assigneeId: 'other-user',
          createdBy: 'creator',
          status: 'in_progress',
          userId: 'user-1',
        }),
      ).toBe(true);
    });

    it('returns true for assigned technicians', () => {
      expect(
        isFooterRoleEligible({
          permissionLevels: { isManager: false, isTechnician: true },
          assigneeId: 'user-1',
          createdBy: 'creator',
          status: 'in_progress',
          userId: 'user-1',
        }),
      ).toBe(true);
    });

    it('returns true for requestor-created submitted work orders', () => {
      expect(
        isFooterRoleEligible({
          permissionLevels: { isManager: false, isTechnician: false },
          assigneeId: null,
          createdBy: 'user-1',
          status: 'submitted',
          userId: 'user-1',
        }),
      ).toBe(true);
    });

    it('returns false when technician is not the assignee', () => {
      expect(
        isFooterRoleEligible({
          permissionLevels: { isManager: false, isTechnician: true },
          assigneeId: 'other-user',
          createdBy: 'creator',
          status: 'in_progress',
          userId: 'user-1',
        }),
      ).toBe(false);
    });
  });

  describe('getMobileWorkOrderDetailsBottomPaddingClass', () => {
    it('returns undefined on desktop', () => {
      expect(getMobileWorkOrderDetailsBottomPaddingClass(false)).toBeUndefined();
    });

    it('uses nav-height + FAB clearance on mobile', () => {
      expect(getMobileWorkOrderDetailsBottomPaddingClass(true)).toBe(
        'pb-[calc(var(--mobile-bottom-nav-height)+3.5rem+1rem)]',
      );
    });
  });

  describe('shouldShowMobileActionFooter', () => {
    it('shows footer on mobile for eligible active work orders', () => {
      expect(
        shouldShowMobileActionFooter({
          isMobile: true,
          isWorkOrderLocked: false,
          workOrderStatus: 'in_progress',
          footerRoleEligible: true,
        }),
      ).toBe(true);
    });

    it('hides footer when completed or cancelled', () => {
      expect(
        shouldShowMobileActionFooter({
          isMobile: true,
          isWorkOrderLocked: false,
          workOrderStatus: 'completed',
          footerRoleEligible: true,
        }),
      ).toBe(false);
    });
  });

  describe('buildWorkOrderPdfInput', () => {
    it('maps work order fields for PDF generation', () => {
      expect(
        buildWorkOrderPdfInput({
          id: 'wo-1',
          title: 'Replace line',
          description: 'Leak repair',
          status: 'in_progress',
          priority: 'high',
          created_date: '2024-01-01T00:00:00Z',
          due_date: '2024-01-05T00:00:00Z',
          completed_date: null,
          estimated_hours: 2,
          assigneeName: 'Tech One',
          teamName: 'Field Team',
          has_pm: true,
        }),
      ).toEqual({
        id: 'wo-1',
        title: 'Replace line',
        description: 'Leak repair',
        status: 'in_progress',
        priority: 'high',
        created_date: '2024-01-01T00:00:00Z',
        due_date: '2024-01-05T00:00:00Z',
        completed_date: null,
        estimated_hours: 2,
        assigneeName: 'Tech One',
        teamName: 'Field Team',
        has_pm: true,
      });
    });

    it('returns the empty fallback when work order is missing', () => {
      expect(buildWorkOrderPdfInput(null)).toEqual({
        id: '',
        title: '',
        description: '',
        status: 'submitted',
        priority: 'medium',
        created_date: '',
      });
    });
  });

  describe('buildEquipmentPdfInput', () => {
    it('maps equipment fields and normalizes customer id', () => {
      expect(
        buildEquipmentPdfInput({
          id: 'eq-1',
          name: 'Excavator',
          manufacturer: 'Cat',
          model: '320',
          serial_number: 'SN-1',
          status: 'active',
          location: 'Yard A',
          customer_id: 'cust-1',
        }),
      ).toEqual({
        id: 'eq-1',
        name: 'Excavator',
        manufacturer: 'Cat',
        model: '320',
        serial_number: 'SN-1',
        status: 'active',
        location: 'Yard A',
        customerId: 'cust-1',
      });
    });
  });

  describe('team and assignee summaries', () => {
    it('builds team summary from work order or equipment team id', () => {
      expect(
        buildWorkOrderTeamSummary(
          { team_id: null, teamName: 'Field Team' },
          { team_id: 'team-1' },
        ),
      ).toEqual({ id: 'team-1', name: 'Field Team' });
    });

    it('returns undefined when team name or id is missing', () => {
      expect(buildWorkOrderTeamSummary({ team_id: 'team-1', teamName: null })).toBeUndefined();
    });

    it('builds compact and mobile assignee summaries', () => {
      expect(buildWorkOrderAssigneeSummary('Matt Technician')).toEqual({ name: 'Matt Technician' });
      expect(buildMobileWorkOrderAssigneeSummary('Matt Technician')).toEqual({
        id: '',
        name: 'Matt Technician',
      });
    });
  });

  describe('mobile summaries and sync state', () => {
    it('builds compact mobile work order and equipment summaries', () => {
      expect(
        buildMobileWorkOrderSummary({
          status: 'in_progress',
          priority: 'high',
          dueDate: '2024-01-05T00:00:00Z',
        }),
      ).toEqual({
        status: 'in_progress',
        priority: 'high',
        due_date: '2024-01-05T00:00:00Z',
      });

      expect(
        buildMobileEquipmentSummary({
          id: 'eq-1',
          name: 'Excavator',
          status: 'active',
        }),
      ).toEqual({
        id: 'eq-1',
        name: 'Excavator',
        status: 'active',
      });
    });

    it('builds offline sync state snapshot', () => {
      expect(
        buildOfflineSyncState({
          isOnline: false,
          isSyncing: true,
          pendingCount: 2,
          failedCount: 1,
        }),
      ).toEqual({
        isOnline: false,
        isSyncing: true,
        pendingCount: 2,
        failedCount: 1,
      });
    });

    it('hides inline note add button when the mobile field footer is shown', () => {
      expect(shouldHideInlineNoteAddButton(true)).toBe(true);
      expect(shouldHideInlineNoteAddButton(false)).toBe(false);
    });

    it('detects when the mobile sync banner should render', () => {
      expect(
        shouldShowMobileSyncBanner({
          isOnline: true,
          isSyncing: false,
          pendingCount: 0,
          failedCount: 0,
        }),
      ).toBe(false);
      expect(
        shouldShowMobileSyncBanner({
          isOnline: false,
          isSyncing: false,
          pendingCount: 0,
          failedCount: 0,
        }),
      ).toBe(true);
    });

    it('raises FAB clearance when sync banner is visible', () => {
      expect(MOBILE_WO_FAB_BOTTOM_CLASS.withSyncBanner).not.toBe(MOBILE_WO_FAB_BOTTOM_CLASS.default);
    });
  });
});
