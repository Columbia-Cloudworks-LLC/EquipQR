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
import { Tables } from '@/integrations/supabase/types';
import { getTeamsByOrganization } from './supabaseDataService';

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
  members: Tables<'team_members'>[];
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
 * @deprecated Use TeamBasedDashboardStats from '@/features/teams/services/teamBasedDashboardService' or '@/hooks/useQueries' instead.
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
