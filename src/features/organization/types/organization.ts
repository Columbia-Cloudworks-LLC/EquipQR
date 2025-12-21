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
  name: string;
  email: string;
  role: OrganizationMemberRole;
  joinedDate: string;
  avatar?: string;
  status: OrganizationMemberStatus;
}

/**
 * @deprecated Use OrganizationMember instead
 * Alias for backward compatibility with hooks using RealOrganizationMember
 */
export type RealOrganizationMember = OrganizationMember;

/**
 * Organization admin (subset of member data)
 */
export interface OrganizationAdmin {
  id: string;
  name: string;
  email: string;
  role: string;
}

/**
 * Raw organization member data from database queries
 * Used internally by services
 */
export interface OrganizationMemberRecord {
  id: string;
  user_id: string;
  organization_id: string;
  role: string;
  status: string;
  joined_date: string;
  user_name?: string;
  user_email?: string;
  slot_purchase_id?: string;
  activated_slot_at?: string;
}

// ============================================
// Organization Types
// ============================================

export interface Organization {
  id: string;
  name: string;
  plan: 'free' | 'premium';
  memberCount: number;
  maxMembers: number;
  features: string[];
  billingCycle?: 'monthly' | 'yearly';
  nextBillingDate?: string;
  logo?: string;
  backgroundColor?: string;
}

/**
 * Organization with user's membership context
 */
export interface OrganizationWithMembership {
  id: string;
  name: string;
  plan: string;
  member_count: number;
  max_members: number;
  features: unknown;
  created_at: string;
  updated_at: string;
  user_role: string;
  joined_date: string;
}

/**
 * Payload for updating organization settings
 */
export interface OrganizationUpdatePayload {
  name?: string;
  logo?: string | null;
  background_color?: string | null;
}

// ============================================
// Invitation Types
// ============================================

export interface InvitationData {
  email: string;
  role: 'admin' | 'member';
  message?: string;
}

// ============================================
// Storage Types
// ============================================

export interface StorageUsageData {
  totalSizeBytes: number;
  totalSizeMB: number;
  totalSizeGB: number;
  itemCount: number;
  equipmentImageCount: number;
  workOrderImageCount: number;
  equipmentImageSizeBytes: number;
  workOrderImageSizeBytes: number;
}

export interface StorageUsage extends StorageUsageData {
  freeQuotaMB: number;
  freeQuotaGB: number;
  overageMB: number;
  overageGB: number;
  costPerGB: number;
  overageCost: number;
}

