/**
 * @deprecated This entire file is deprecated. Migration guide:
 * 
 * Equipment hooks:
 * - useSyncEquipmentByOrganization → useEquipment from '@/features/equipment/hooks/useEquipment'
 * - useSyncEquipmentById → useEquipmentById from '@/features/equipment/hooks/useEquipment'
 * 
 * Work Order hooks:
 * - useSyncWorkOrdersByOrganization → useWorkOrders from '@/hooks/useWorkOrders'
 * - useSyncWorkOrderById → useWorkOrderById from '@/hooks/useWorkOrders'
 * - useSyncWorkOrderByIdEnhanced → useWorkOrderById from '@/hooks/useWorkOrders'
 * - useSyncWorkOrdersByEquipment → useEquipmentWorkOrders from '@/features/equipment/hooks/useEquipment'
 * 
 * Teams hooks:
 * - useSyncTeamsByOrganization → useTeams from '@/features/teams/hooks/useTeamManagement'
 * - useSyncTeamById → useTeams from '@/features/teams/hooks/useTeamManagement'
 * - useSyncTeamMembersByTeam → useTeams from '@/features/teams/hooks/useTeamManagement'
 * 
 * Scans/Notes hooks:
 * - useSyncScansByEquipment → useEquipmentScans from '@/features/equipment/hooks/useEquipment'
 * - useSyncNotesByEquipment → useEquipmentNotes from '@/features/equipment/hooks/useEquipment'
 * 
 * Dashboard hooks:
 * - useSyncDashboardStats → useDashboard from '@/hooks/useQueries'
 * 
 * Types:
 * - Equipment → use Tables<'equipment'> from '@/integrations/supabase/types'
 * - WorkOrder → use Tables<'work_orders'> from '@/integrations/supabase/types'
 * - Team → use Tables<'teams'> from '@/integrations/supabase/types'
 * 
 * @module syncDataService
 * @see {@link @/features/equipment/hooks/useEquipment} for equipment-related hooks
 * @see {@link @/hooks/useWorkOrders} for work order hooks
 * @see {@link @/features/teams/hooks/useTeamManagement} for team hooks
 */
import { useQuery } from '@tanstack/react-query';
import { getEquipmentByOrganization, getEquipmentById, getAllWorkOrdersByOrganization, getWorkOrdersByEquipmentId, getTeamsByOrganization, getScansByEquipmentId, getNotesByEquipmentId, getDashboardStatsByOrganization } from './supabaseDataService';
import { WorkOrderService } from '@/features/work-orders/services/workOrderService';

/**
 * @deprecated Use Tables<'equipment'> from '@/integrations/supabase/types' instead.
 */
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

/**
 * @deprecated Use Tables<'work_orders'> from '@/integrations/supabase/types' instead.
 */
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

/**
 * @deprecated Use Tables<'teams'> from '@/integrations/supabase/types' instead.
 */
export interface Team {
  id: string;
  name: string;
  description: string;
  members: TeamMember[];
  specializations: string[];
  activeWorkOrders: number;
}

/**
 * @deprecated Use Tables<'team_members'> from '@/integrations/supabase/types' instead.
 */
export interface TeamMember {
  id: string;
  name: string;
  role: string;
  email: string;
  skills: string[];
}

/**
 * @deprecated Use Tables<'scans'> from '@/integrations/supabase/types' instead.
 */
export interface Scan {
  id: string;
  equipmentId: string;
  scannedBy: string;
  scannedAt: string;
  location?: string;
  notes?: string;
}

/**
 * @deprecated Use Tables<'notes'> from '@/integrations/supabase/types' instead.
 */
export interface Note {
  id: string;
  equipmentId: string;
  content: string;
  authorId: string;
  authorName: string;
  createdAt: string;
  isPrivate?: boolean;
}

/**
 * @deprecated Use DashboardStats from '@/services/supabaseDataService' or '@/hooks/useQueries' instead.
 */
export interface DashboardStats {
  totalEquipment: number;
  activeEquipment: number;
  maintenanceEquipment: number;
  totalWorkOrders: number;
  pendingWorkOrders: number;
  completedWorkOrders: number;
}

/**
 * @deprecated Use useEquipment from '@/features/equipment/hooks/useEquipment' instead.
 */
export const useSyncEquipmentByOrganization = (organizationId?: string) => {
  return useQuery({
    queryKey: ['equipment', organizationId],
    queryFn: () => organizationId ? getEquipmentByOrganization(organizationId) : [],
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * @deprecated Use useEquipmentById from '@/features/equipment/hooks/useEquipment' instead.
 */
export const useSyncEquipmentById = (organizationId: string, equipmentId: string) => {
  return useQuery({
    queryKey: ['equipment', organizationId, equipmentId],
    queryFn: () => getEquipmentById(organizationId, equipmentId),
    enabled: !!organizationId && !!equipmentId,
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * @deprecated Use useWorkOrders from '@/hooks/useWorkOrders' instead.
 */
export const useSyncWorkOrdersByOrganization = (organizationId?: string) => {
  return useQuery({
    queryKey: ['workOrders', organizationId],
    queryFn: () => organizationId ? getAllWorkOrdersByOrganization(organizationId) : [],
    enabled: !!organizationId,
    staleTime: 2 * 60 * 1000, // 2 minutes for work orders
  });
};

/**
 * @deprecated Use useWorkOrderById from '@/hooks/useWorkOrders' instead.
 */
export const useSyncWorkOrderById = (organizationId: string, workOrderId: string) => {
  return useQuery({
    queryKey: ['workOrder', organizationId, workOrderId],
    queryFn: async () => {
      const service = new WorkOrderService(organizationId);
      const result = await service.getById(workOrderId);
      if (result.success && result.data) {
        return result.data;
      }
      return null;
    },
    enabled: !!organizationId && !!workOrderId,
    staleTime: 2 * 60 * 1000,
  });
};

/**
 * @deprecated Use useEquipmentWorkOrders from '@/features/equipment/hooks/useEquipment' instead.
 */
export const useSyncWorkOrdersByEquipment = (organizationId: string, equipmentId: string) => {
  return useQuery({
    queryKey: ['workOrders', 'equipment', organizationId, equipmentId],
    queryFn: () => getWorkOrdersByEquipmentId(organizationId, equipmentId),
    enabled: !!organizationId && !!equipmentId,
    staleTime: 2 * 60 * 1000,
  });
};

/**
 * @deprecated Use useTeams from '@/features/teams/hooks/useTeamManagement' instead.
 */
export const useSyncTeamsByOrganization = (organizationId?: string) => {
  return useQuery({
    queryKey: ['teams', organizationId],
    queryFn: () => organizationId ? getTeamsByOrganization(organizationId) : [],
    enabled: !!organizationId,
    staleTime: 10 * 60 * 1000, // 10 minutes for teams
  });
};

/**
 * @deprecated Use useTeams from '@/features/teams/hooks/useTeamManagement' instead.
 */
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

/**
 * @deprecated Use useTeams from '@/features/teams/hooks/useTeamManagement' instead.
 */
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

/**
 * @deprecated Use useEquipmentScans from '@/features/equipment/hooks/useEquipment' instead.
 */
export const useSyncScansByEquipment = (organizationId: string, equipmentId: string) => {
  return useQuery({
    queryKey: ['scans', organizationId, equipmentId],
    queryFn: () => getScansByEquipmentId(organizationId, equipmentId),
    enabled: !!organizationId && !!equipmentId,
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * @deprecated Use useEquipmentNotes from '@/features/equipment/hooks/useEquipment' instead.
 */
export const useSyncNotesByEquipment = (organizationId: string, equipmentId: string) => {
  return useQuery({
    queryKey: ['notes', organizationId, equipmentId],
    queryFn: () => getNotesByEquipmentId(organizationId, equipmentId),
    enabled: !!organizationId && !!equipmentId,
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * @deprecated Use useDashboard from '@/hooks/useQueries' instead.
 */
export const useSyncDashboardStats = (organizationId?: string) => {
  return useQuery({
    queryKey: ['dashboardStats', organizationId],
    queryFn: () => organizationId ? getDashboardStatsByOrganization(organizationId) : null,
    enabled: !!organizationId,
    staleTime: 2 * 60 * 1000,
  });
};

/**
 * @deprecated Use useWorkOrderById from '@/hooks/useWorkOrders' instead.
 */
export const useSyncWorkOrderByIdEnhanced = (organizationId: string, workOrderId: string) => {
  return useQuery({
    queryKey: ['workOrder', 'enhanced', organizationId, workOrderId],
    queryFn: async () => {
      const service = new WorkOrderService(organizationId);
      const result = await service.getById(workOrderId);
      if (result.success && result.data) {
        return result.data;
      }
      return null;
    },
    enabled: !!organizationId && !!workOrderId,
    staleTime: 1 * 60 * 1000, // 1 minute for enhanced queries
    refetchInterval: 30 * 1000, // Refetch every 30 seconds for real-time updates
  });
};
