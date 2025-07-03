export type Role = 'owner' | 'admin' | 'member' | 'viewer';
export type TeamRole = 'manager' | 'technician';

export interface UserContext {
  userId: string;
  organizationId: string;
  userRole: Role;
  teamMemberships: Array<{
    teamId: string;
    role: TeamRole;
  }>;
}

export interface EntityPermissions {
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canAssign?: boolean;
  canChangeStatus?: boolean;
  canAddNotes?: boolean;
  canAddImages?: boolean;
}

export interface WorkOrderDetailedPermissions {
  canEdit: boolean;
  canEditPriority: boolean;
  canEditAssignment: boolean;
  canEditDueDate: boolean;
  canEditDescription: boolean;
  canChangeStatus: boolean;
  canAddNotes: boolean;
  canAddImages: boolean;
  canAddCosts: boolean;
  canEditCosts: boolean;
  canViewPM: boolean;
  canEditPM: boolean;
}

export interface OrganizationPermissions {
  canManage: boolean;
  canInviteMembers: boolean;
  canCreateTeams: boolean;
  canViewBilling: boolean;
  canManageMembers: boolean;
}

export interface EquipmentNotesPermissions {
  canViewNotes: boolean;
  canAddPublicNote: boolean;
  canAddPrivateNote: boolean;
  canEditOwnNote: (note: { author_id: string }) => boolean;
  canEditAnyNote: boolean;
  canDeleteOwnNote: (note: { author_id: string }) => boolean;
  canDeleteAnyNote: boolean;
  canUploadImages: boolean;
  canDeleteImages: boolean;
  canSetDisplayImage: boolean;
}

export interface PermissionRule {
  name: string;
  check: (context: UserContext, entityContext?: any) => boolean;
  priority: number;
}

export interface PermissionCache {
  [key: string]: {
    result: boolean;
    timestamp: number;
    ttl: number;
  };
}