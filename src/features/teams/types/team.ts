/**
 * Team Types - Consolidated type definitions
 * 
 * This file serves as the single source of truth for team types.
 * Import from here instead of defining types locally in components/hooks.
 */

import { Database } from '@/integrations/supabase/types';

// ============================================
// Database Row Types
// ============================================

export type TeamRow = Database['public']['Tables']['teams']['Row'];
export type TeamInsert = Database['public']['Tables']['teams']['Insert'];
export type TeamUpdate = Database['public']['Tables']['teams']['Update'];
export type TeamMemberRow = Database['public']['Tables']['team_members']['Row'];
export type TeamMemberInsert = Database['public']['Tables']['team_members']['Insert'];
export type TeamMemberRole = Database['public']['Enums']['team_member_role'];

// ============================================
// Team Member Types
// ============================================

/**
 * Team member with profile information
 * Used when displaying team member lists
 */
export interface TeamMember {
  id: string;
  user_id: string;
  team_id: string;
  role: TeamMemberRole;
  joined_date: string;
  user_name?: string;
  user_email?: string;
}

/**
 * Simplified team member for display purposes
 */
export interface TeamMemberDisplay {
  id: string;
  name: string;
  email: string;
  role: TeamMemberRole;
}

// ============================================
// Team Location Types
// ============================================

export interface TeamLocation {
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  lat?: number;
  lng?: number;
}

// ============================================
// Team Types
// ============================================

/**
 * Team with computed member count
 * Used for list views where full member data isn't needed
 */
export interface Team {
  id: string;
  name: string;
  description: string;
  organization_id: string;
  member_count: number;
  created_at: string;
  updated_at: string;
  image_url?: string | null;
  location_address?: string;
  location_city?: string;
  location_state?: string;
  location_country?: string;
  location_lat?: number;
  location_lng?: number;
  override_equipment_location?: boolean;
}

/**
 * Team with full member details
 * Used when displaying team details or editing
 */
export interface TeamWithMembers extends TeamRow {
  members: Array<TeamMemberRow & {
    profiles: {
      name: string;
      email: string;
    } | null;
  }>;
  member_count: number;
}

/**
 * @deprecated Use Team instead
 * Alias for backward compatibility
 */
export type OptimizedTeam = Team;

/**
 * @deprecated Use TeamMember instead  
 * Alias for backward compatibility
 */
export type OptimizedTeamMember = TeamMember;

// ============================================
// Team Filter Types
// ============================================

export interface TeamFilters {
  search?: string;
  organizationId?: string;
}

