/**
 * Organization Types - Consolidated type definitions
 * 
 * This file serves as the single source of truth for organization types.
 * Import from here instead of defining types locally in components/hooks.
 */

// ============================================
// Organization Member Types
// ============================================

export type OrganizationMemberRole = 'owner' | 'admin' | 'member';
export type OrganizationMemberStatus = 'active' | 'pending' | 'inactive';

/**
 * Organization member with profile information (UI format)
 * Primary type for displaying organization members
 */
export interface OrganizationMember {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: OrganizationMemberRole;
  joinedDate: string;
  avatar?: string;
  status: OrganizationMemberStatus;
  /** Whether this member can manage QuickBooks integration (admins only, owners always can) */
  canManageQuickBooks?: boolean;
}

/**
 * Organization admin (subset of member data)
 */
export interface OrganizationAdmin {
  id: string;
  name: string;
  email: string;
  role: string;
}

// ============================================
// Organization Types
// ============================================

/**
 * Payload for updating organization settings
 */
export interface OrganizationUpdatePayload {
  name?: string;
  logo?: string | null;
  background_color?: string | null;
  scan_location_collection_enabled?: boolean;
  inventory_default_location_name?: string | null;
  inventory_default_location_address?: string | null;
  inventory_default_location_city?: string | null;
  inventory_default_location_state?: string | null;
  inventory_default_location_country?: string | null;
  inventory_default_location_lat?: number | null;
  inventory_default_location_lng?: number | null;
}
