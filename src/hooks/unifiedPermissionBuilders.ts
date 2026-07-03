import type { WorkOrderData } from '@/features/work-orders/types/workOrder';
import {
  canAddWorkOrderNotes,
  isWorkOrderEditLocked,
} from '@/features/work-orders/utils/workOrderNotePermissions';
import type {
  EntityPermissions,
  EquipmentNotesPermissions,
  OrganizationPermissions,
  UserContext,
  WorkOrderDetailedPermissions,
} from '@/types/permissions';

type HasPermission = (
  permission: string,
  entityContext?: { teamId?: string; assigneeId?: string; status?: string; createdBy?: string },
) => boolean;
type HasRole = (roles: string | string[]) => boolean;
type TeamCheck = (teamId: string) => boolean;
type CurrentOrganizationSummary = { memberCount?: number } | null | undefined;

export function buildOrganizationPermissions(
  hasPermission: HasPermission,
  hasRole: HasRole,
): OrganizationPermissions {
  return {
    canManage: hasPermission('organization.manage'),
    canInviteMembers: hasPermission('organization.invite'),
    canCreateTeams: hasPermission('organization.manage'),
    canViewBilling: hasRole(['owner', 'admin']),
    canManageMembers: hasRole(['owner', 'admin']),
  };
}

export function buildEquipmentPermissions(
  hasPermission: HasPermission,
  hasRole: HasRole,
  userContext: UserContext | null,
) {
  return {
    getPermissions: (equipmentTeamId?: string): EntityPermissions => {
      const entityContext = equipmentTeamId ? { teamId: equipmentTeamId } : undefined;

      return {
        canView: hasPermission('equipment.view', entityContext),
        canCreate: hasPermission('equipment.create', entityContext),
        canEdit: hasPermission('equipment.edit', entityContext),
        canDelete: hasPermission('equipment.delete', entityContext),
        canAddNotes: hasPermission('equipment.view', entityContext),
        canAddImages: hasPermission('equipment.view', entityContext),
      };
    },
    canViewAll: hasRole(['owner', 'admin', 'member']),
    canCreateAny: hasRole(['owner', 'admin']),
    canCreateForTeam: (teamId: string): boolean => {
      return hasPermission('equipment.create', { teamId });
    },
    canCreateForAnyTeam:
      hasRole(['owner', 'admin']) ||
      (userContext?.teamMemberships ?? []).some(
        tm => tm.role === 'manager' || tm.role === 'technician',
      ),
  };
}

function getWorkOrderEntityContext(workOrder?: WorkOrderData) {
  return workOrder
    ? {
        teamId: workOrder.teamId,
        assigneeId: workOrder.assigneeId,
        status: workOrder.status,
        createdBy: workOrder.createdBy,
      }
    : undefined;
}

function buildWorkOrderNotePermissionInput(
  workOrder: WorkOrderData | undefined,
  userContext: UserContext | null,
) {
  return {
    status: workOrder?.status ?? 'submitted',
    teamId: workOrder?.teamId,
    createdBy: workOrder?.createdBy,
    userId: userContext?.userId,
    isOrgAdmin: userContext ? ['owner', 'admin'].includes(userContext.userRole) : false,
    teamMemberships: userContext?.teamMemberships ?? [],
  };
}

export function buildWorkOrderPermissions(
  hasPermission: HasPermission,
  hasRole: HasRole,
  isTeamMember: TeamCheck,
  isTeamManager: TeamCheck,
  userContext: UserContext | null,
) {
  return {
    getPermissions: (workOrder?: WorkOrderData): EntityPermissions => {
      const entityContext = getWorkOrderEntityContext(workOrder);
      const notePermissionInput = buildWorkOrderNotePermissionInput(workOrder, userContext);

      return {
        canView: hasPermission('workorder.view', entityContext),
        canCreate: hasRole(['owner', 'admin', 'member']),
        canEdit: hasPermission('workorder.edit', entityContext),
        canDelete: hasRole(['owner', 'admin']),
        canAssign: hasPermission('workorder.assign', entityContext),
        canChangeStatus: hasPermission('workorder.changestatus', entityContext),
        canAddNotes: canAddWorkOrderNotes(notePermissionInput),
        canAddImages: canAddWorkOrderNotes(notePermissionInput),
      };
    },
    getDetailedPermissions: (workOrder?: WorkOrderData): WorkOrderDetailedPermissions => {
      const entityContext = getWorkOrderEntityContext(workOrder);
      const canEdit = hasPermission('workorder.edit', entityContext);
      const canView = hasPermission('workorder.view', entityContext);
      const isLocked = workOrder ? isWorkOrderEditLocked(workOrder.status) : false;
      const notePermissionInput = buildWorkOrderNotePermissionInput(workOrder, userContext);
      const canAddNotes = canAddWorkOrderNotes(notePermissionInput);

      return {
        canEdit: canEdit && !isLocked,
        canEditPriority: canEdit && !isLocked,
        canEditAssignment: hasPermission('workorder.assign', entityContext) && !isLocked,
        canEditDueDate: canView && !isLocked,
        canEditDescription: canView && !isLocked,
        canChangeStatus: hasPermission('workorder.changestatus', entityContext),
        canAddNotes,
        canAddImages: canAddNotes,
        canAddCosts: (hasRole(['owner', 'admin']) || isTeamManager(workOrder?.teamId)) && !isLocked,
        canEditCosts: (hasRole(['owner', 'admin']) || isTeamManager(workOrder?.teamId)) && !isLocked,
        canViewPM: hasRole(['owner', 'admin']) || isTeamMember(workOrder?.teamId),
        canEditPM: (hasRole(['owner', 'admin']) || isTeamMember(workOrder?.teamId)) && !isLocked,
      };
    },
    canViewAll: hasRole(['owner', 'admin']),
    canCreateAny: hasRole(['owner', 'admin', 'member']),
    canAssignAny: hasRole(['owner', 'admin']),
  };
}

export function buildTeamPermissions(hasPermission: HasPermission, hasRole: HasRole) {
  return {
    getPermissions: (teamId?: string): EntityPermissions => {
      const entityContext = teamId ? { teamId } : undefined;

      return {
        canView: hasPermission('team.view', entityContext),
        canCreate: hasRole(['owner', 'admin']),
        canEdit: hasPermission('team.manage', entityContext),
        canDelete: hasRole(['owner', 'admin']),
        canAddNotes: false,
        canAddImages: false,
      };
    },
    canViewAll: hasRole(['owner', 'admin']),
    canCreateAny: hasRole(['owner', 'admin']),
    canManageAny: hasRole(['owner', 'admin']),
  };
}

export function buildInventoryPermissions(hasRole: HasRole) {
  return {
    getPermissions: (
      isPartsManager: boolean = false,
      isPartsConsumer: boolean = false,
    ): EntityPermissions => ({
      canView: hasRole(['owner', 'admin']) || isPartsManager || isPartsConsumer,
      canCreate: hasRole(['owner', 'admin']) || isPartsManager,
      canEdit: hasRole(['owner', 'admin']) || isPartsManager,
      canDelete: hasRole(['owner', 'admin']),
      canAddNotes: hasRole(['owner', 'admin']) || isPartsManager,
      canAddImages: hasRole(['owner', 'admin']) || isPartsManager,
    }),
    canManageAny: (isPartsManager: boolean = false) =>
      hasRole(['owner', 'admin']) || isPartsManager,
    canViewAny: (isPartsManager: boolean = false, isPartsConsumer: boolean = false) =>
      hasRole(['owner', 'admin']) || isPartsManager || isPartsConsumer,
    canManagePartsManagers: hasRole(['owner', 'admin']),
    canManagePartsConsumers: hasRole(['owner', 'admin']),
  };
}

export function buildEquipmentNotesPermissions(
  currentOrganization: CurrentOrganizationSummary,
  userContext: UserContext | null,
  hasRole: HasRole,
  isTeamMember: TeamCheck,
  canManageTeam: TeamCheck,
) {
  return (equipmentTeamId?: string): EquipmentNotesPermissions => {
    const hasTeamAccess = equipmentTeamId ? isTeamMember(equipmentTeamId) : true;
    const isTeamManager = equipmentTeamId ? canManageTeam(equipmentTeamId) : false;
    const isOrgAdmin = hasRole(['owner', 'admin']);
    const isSingleUserOrg = currentOrganization?.memberCount === 1;

    return {
      canViewNotes: hasTeamAccess || isOrgAdmin,
      canAddPublicNote: hasTeamAccess || isOrgAdmin,
      canAddPrivateNote: (hasTeamAccess && hasRole(['member', 'admin', 'owner'])) || isOrgAdmin,
      canEditOwnNote: note => note.author_id === userContext?.userId,
      canEditAnyNote: isOrgAdmin || isTeamManager,
      canDeleteOwnNote: note => note.author_id === userContext?.userId,
      canDeleteAnyNote: isOrgAdmin || isTeamManager,
      canUploadImages: !isSingleUserOrg && (hasTeamAccess || isOrgAdmin),
      canDeleteImages: isOrgAdmin || isTeamManager,
      canSetDisplayImage: isOrgAdmin || isTeamManager,
    };
  };
}
