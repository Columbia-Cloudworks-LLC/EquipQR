import { useQuery } from '@tanstack/react-query';
import { getEquipmentByOrganization, getEquipmentById, getAllWorkOrdersByOrganization, getWorkOrdersByEquipmentId, getTeamsByOrganization, getScansByEquipmentId, getNotesByEquipmentId, getDashboardStatsByOrganization } from './supabaseDataService';
import { getWorkOrderByIdWithAssignee } from './workOrderDataService';

export interface Equipment {
  id: string;
  name: string;
  manufacturer: string;
  model: string;
  serial_number: string;
  status: 'active' | 'maintenance' | 'inactive';
  location: string;
  installation_date: string;
  warranty_expiration: string;
  last_maintenance: string;
  notes?: string;
  image_url?: string;
}

export interface WorkOrder {
  id: string;
  title: string;
  description: string;
  equipmentId: string;
  priority: 'low' | 'medium' | 'high';
  status: 'submitted' | 'accepted' | 'assigned' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled';
  assigneeId?: string;
  assigneeName?: string;
  teamId?: string;
  teamName?: string;
  createdDate: string;
  dueDate?: string;
  estimatedHours?: number;
  completedDate?: string;
}

export interface Team {
  id: string;
  name: string;
  description: string;
  members: TeamMember[];
  specializations: string[];
  activeWorkOrders: number;
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  email: string;
  skills: string[];
}

export interface Scan {
  id: string;
  equipmentId: string;
  scannedBy: string;
  scannedAt: string;
  location?: string;
  notes?: string;
}

export interface Note {
  id: string;
  equipmentId: string;
  content: string;
  authorId: string;
  authorName: string;
  createdAt: string;
  isPrivate?: boolean;
}

export interface DashboardStats {
  totalEquipment: number;
  activeEquipment: number;
  maintenanceEquipment: number;
  totalWorkOrders: number;
  pendingWorkOrders: number;
  completedWorkOrders: number;
}

// Synchronous data service functions
// @deprecated Use useEquipment from '@/components/equipment/hooks/useEquipment' instead. Will be removed in Phase 2.
export const useSyncEquipmentByOrganization = (organizationId?: string) => {
  return useQuery({
    queryKey: ['equipment', organizationId],
    queryFn: () => organizationId ? getEquipmentByOrganization(organizationId) : [],
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// @deprecated Use useEquipmentById from '@/components/equipment/hooks/useEquipment' instead. Will be removed in Phase 2.
export const useSyncEquipmentById = (organizationId: string, equipmentId: string) => {
  return useQuery({
    queryKey: ['equipment', organizationId, equipmentId],
    queryFn: () => getEquipmentById(organizationId, equipmentId),
    enabled: !!organizationId && !!equipmentId,
    staleTime: 5 * 60 * 1000,
  });
};

export const useSyncWorkOrdersByOrganization = (organizationId?: string) => {
  return useQuery({
    queryKey: ['workOrders', organizationId],
    queryFn: () => organizationId ? getAllWorkOrdersByOrganization(organizationId) : [],
    enabled: !!organizationId,
    staleTime: 2 * 60 * 1000, // 2 minutes for work orders
  });
};

export const useSyncWorkOrderById = (organizationId: string, workOrderId: string) => {
  return useQuery({
    queryKey: ['workOrder', organizationId, workOrderId],
    queryFn: () => getWorkOrderByIdWithAssignee(organizationId, workOrderId),
    enabled: !!organizationId && !!workOrderId,
    staleTime: 2 * 60 * 1000,
  });
};

export const useSyncWorkOrdersByEquipment = (organizationId: string, equipmentId: string) => {
  return useQuery({
    queryKey: ['workOrders', 'equipment', organizationId, equipmentId],
    queryFn: () => getWorkOrdersByEquipmentId(organizationId, equipmentId),
    enabled: !!organizationId && !!equipmentId,
    staleTime: 2 * 60 * 1000,
  });
};

export const useSyncTeamsByOrganization = (organizationId?: string) => {
  return useQuery({
    queryKey: ['teams', organizationId],
    queryFn: () => organizationId ? getTeamsByOrganization(organizationId) : [],
    enabled: !!organizationId,
    staleTime: 10 * 60 * 1000, // 10 minutes for teams
  });
};

export const useSyncTeamById = (organizationId: string, teamId: string) => {
  return useQuery({
    queryKey: ['team', organizationId, teamId],
    queryFn: async () => {
      const teams = await getTeamsByOrganization(organizationId);
      return teams.find(team => team.id === teamId) || null;
    },
    enabled: !!organizationId && !!teamId,
    staleTime: 10 * 60 * 1000,
  });
};

export const useSyncTeamMembersByTeam = (organizationId: string, teamId: string) => {
  return useQuery({
    queryKey: ['teamMembers', organizationId, teamId],
    queryFn: async () => {
      const teams = await getTeamsByOrganization(organizationId);
      const team = teams.find(team => team.id === teamId);
      return team?.members || [];
    },
    enabled: !!organizationId && !!teamId,
    staleTime: 10 * 60 * 1000,
  });
};

export const useSyncScansByEquipment = (organizationId: string, equipmentId: string) => {
  return useQuery({
    queryKey: ['scans', organizationId, equipmentId],
    queryFn: () => getScansByEquipmentId(organizationId, equipmentId),
    enabled: !!organizationId && !!equipmentId,
    staleTime: 5 * 60 * 1000,
  });
};

export const useSyncNotesByEquipment = (organizationId: string, equipmentId: string) => {
  return useQuery({
    queryKey: ['notes', organizationId, equipmentId],
    queryFn: () => getNotesByEquipmentId(organizationId, equipmentId),
    enabled: !!organizationId && !!equipmentId,
    staleTime: 5 * 60 * 1000,
  });
};

export const useSyncDashboardStats = (organizationId?: string) => {
  return useQuery({
    queryKey: ['dashboardStats', organizationId],
    queryFn: () => organizationId ? getDashboardStatsByOrganization(organizationId) : null,
    enabled: !!organizationId,
    staleTime: 2 * 60 * 1000,
  });
};

// Enhanced work order query with real-time updates
export const useSyncWorkOrderByIdEnhanced = (organizationId: string, workOrderId: string) => {
  return useQuery({
    queryKey: ['workOrder', 'enhanced', organizationId, workOrderId],
    queryFn: () => getWorkOrderByIdWithAssignee(organizationId, workOrderId),
    enabled: !!organizationId && !!workOrderId,
    staleTime: 1 * 60 * 1000, // 1 minute for enhanced queries
    refetchInterval: 30 * 1000, // Refetch every 30 seconds for real-time updates
  });
};
