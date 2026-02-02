export interface WorkOrderData {
  id: string;
  title: string;
  description: string;
  status: 'submitted' | 'accepted' | 'assigned' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high';
  created_date: string;
  due_date?: string;
  completed_date?: string;
  estimated_hours?: number;
  assignee_id?: string;
  assigneeName?: string;
  teamName?: string;
  team_id?: string;
  equipment_id: string;
  organization_id: string;
  has_pm?: boolean;
  assignee?: {
    id: string;
    name: string;
  };
}

export interface EquipmentData {
  id: string;
  name: string;
  manufacturer?: string;
  model?: string;
  serial_number?: string;
  status: 'active' | 'maintenance' | 'inactive';
  location?: string;
  team_id?: string | null;
}

export interface PMData {
  id: string;
  status: string;
  completed_at?: string;
  checklist_data?: unknown;
  notes?: string;
  created_at: string;
  template_id?: string | null;
}

export interface PermissionLevels {
  isManager: boolean;
  isRequestor: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canAssign: boolean;
  canChangeStatus: boolean;
  canAddNotes: boolean;
  canAddImages: boolean;
  canEditPriority?: boolean;
  canEditAssignment?: boolean;
  canEditDueDate?: boolean;
  canEditDescription?: boolean;
  canAddCosts?: boolean;
  canEditCosts?: boolean;
  canViewPM?: boolean;
  canEditPM?: boolean;
}

export interface TeamMemberData {
  id?: string;
  name: string;
  email?: string;
  role?: 'manager' | 'technician' | 'requestor' | 'viewer';
  status?: 'active' | 'pending' | 'inactive';
}

export interface OrganizationData {
  id: string;
  name: string;
  plan: 'free' | 'premium';
  memberCount: number;
  maxMembers: number;
  features: string[];
}

