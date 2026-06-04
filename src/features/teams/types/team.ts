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
  customer_id?: string | null;
  customer_name?: string | null;
  customer_status?: string | null;
  customer_is_tax_exempt?: boolean | null;
  quickbooks_synced_at?: string | null;
}

// ============================================
// Customer Account Types
// ============================================

export type CustomerRow = Database['public']['Tables']['customers']['Row'];
export type CustomerInsert = Database['public']['Tables']['customers']['Insert'];
export type CustomerUpdate = Database['public']['Tables']['customers']['Update'];

export type ExternalContactRow = Database['public']['Tables']['external_customer_contacts']['Row'];
export type ExternalContactInsert = Database['public']['Tables']['external_customer_contacts']['Insert'];
export type ExternalContactUpdate = Database['public']['Tables']['external_customer_contacts']['Update'];

/** Rows returned by list queries that omit debug-only `source_payload`. */
export type ExternalContactListRow = Omit<ExternalContactRow, 'source_payload'>;

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

