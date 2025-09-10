/**
 * Organization domain types
 * Consolidated from scattered organization interfaces
 * Following SOLID principles with clear inheritance hierarchy
 */

import { BaseEntity, AuditableEntity, EntityStatus } from '@/shared/types/common';

/**
 * Core Organization entity
 */
export interface Organization extends AuditableEntity {
  name: string;
  description?: string;
  website?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  timezone?: string;
  currency?: string;
  status: OrganizationStatus;
  subscription_plan?: SubscriptionPlan;
  subscription_status?: SubscriptionStatus;
  trial_ends_at?: string;
  billing_email?: string;
  settings?: OrganizationSettings;
  
  // Computed fields
  member_count?: number;
  equipment_count?: number;
  work_order_count?: number;
  storage_used_bytes?: number;
  storage_limit_bytes?: number;
  is_trial?: boolean;
  is_active?: boolean;
}

/**
 * Organization status enum
 */
export enum OrganizationStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  TRIAL = 'trial',
  CANCELLED = 'cancelled'
}

/**
 * Subscription plan enum
 */
export enum SubscriptionPlan {
  FREE = 'free',
  BASIC = 'basic',
  PROFESSIONAL = 'professional',
  ENTERPRISE = 'enterprise'
}

/**
 * Subscription status enum
 */
export enum SubscriptionStatus {
  ACTIVE = 'active',
  TRIALING = 'trialing',
  PAST_DUE = 'past_due',
  CANCELED = 'canceled',
  UNPAID = 'unpaid'
}

/**
 * Organization settings
 */
export interface OrganizationSettings {
  allow_guest_access?: boolean;
  require_email_verification?: boolean;
  default_work_order_priority?: string;
  default_equipment_status?: string;
  maintenance_reminder_days?: number;
  auto_assign_work_orders?: boolean;
  enable_notifications?: boolean;
  enable_analytics?: boolean;
  enable_api_access?: boolean;
  custom_fields?: Record<string, any>;
  theme_settings?: {
    primary_color?: string;
    logo_url?: string;
    favicon_url?: string;
  };
  notification_settings?: {
    email_work_order_updates?: boolean;
    email_maintenance_reminders?: boolean;
    email_team_invitations?: boolean;
    email_billing_updates?: boolean;
  };
}

/**
 * Organization member entity
 */
export interface OrganizationMember extends AuditableEntity {
  organization_id: string;
  user_id: string;
  role: OrganizationRole;
  status: MemberStatus;
  invited_by?: string;
  invited_at?: string;
  joined_at?: string;
  last_active_at?: string;
  permissions?: string[];
  
  // Computed fields
  user_name?: string;
  user_email?: string;
  invited_by_name?: string;
  is_online?: boolean;
  days_since_last_active?: number;
}

/**
 * Organization role enum
 */
export enum OrganizationRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  MANAGER = 'manager',
  MEMBER = 'member',
  VIEWER = 'viewer'
}

/**
 * Member status enum
 */
export enum MemberStatus {
  ACTIVE = 'active',
  INVITED = 'invited',
  SUSPENDED = 'suspended',
  LEFT = 'left'
}

/**
 * Organization invitation entity
 */
export interface OrganizationInvitation extends AuditableEntity {
  organization_id: string;
  email: string;
  role: OrganizationRole;
  status: InvitationStatus;
  invited_by: string;
  expires_at: string;
  accepted_at?: string;
  token: string;
  message?: string;
  
  // Computed fields
  invited_by_name?: string;
  organization_name?: string;
  is_expired?: boolean;
  days_until_expiry?: number;
}

/**
 * Invitation status enum
 */
export enum InvitationStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  DECLINED = 'declined',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled'
}

/**
 * Organization filters for queries
 */
export interface OrganizationFilters {
  status?: OrganizationStatus | 'all';
  subscription_plan?: SubscriptionPlan | 'all';
  search?: string;
  created_after?: string;
  created_before?: string;
  has_trial?: boolean;
  is_active?: boolean;
}

/**
 * Organization creation data
 */
export interface CreateOrganizationData {
  name: string;
  description?: string;
  website?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  timezone?: string;
  currency?: string;
  billing_email?: string;
  settings?: OrganizationSettings;
}

/**
 * Organization update data
 */
export interface UpdateOrganizationData {
  name?: string;
  description?: string;
  website?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  timezone?: string;
  currency?: string;
  billing_email?: string;
  settings?: OrganizationSettings;
}

/**
 * Enhanced Organization with related data
 */
export interface EnhancedOrganization extends Organization {
  members?: OrganizationMember[];
  invitations?: OrganizationInvitation[];
  stats?: OrganizationStats;
  recent_activity?: ActivityItem[];
}

/**
 * Organization statistics
 */
export interface OrganizationStats {
  total_members: number;
  active_members: number;
  pending_invitations: number;
  total_equipment: number;
  active_equipment: number;
  total_work_orders: number;
  completed_work_orders: number;
  overdue_work_orders: number;
  storage_used_bytes: number;
  storage_limit_bytes: number;
  storage_usage_percentage: number;
  monthly_work_orders: number;
  monthly_equipment_added: number;
  avg_work_order_completion_time: number;
  by_role: Record<OrganizationRole, number>;
  by_status: Record<MemberStatus, number>;
}

/**
 * Activity item for organization timeline
 */
export interface ActivityItem {
  id: string;
  type: ActivityType;
  description: string;
  user_id: string;
  user_name?: string;
  created_at: string;
  metadata?: Record<string, any>;
}

/**
 * Activity types
 */
export enum ActivityType {
  MEMBER_JOINED = 'member_joined',
  MEMBER_LEFT = 'member_left',
  MEMBER_ROLE_CHANGED = 'member_role_changed',
  EQUIPMENT_ADDED = 'equipment_added',
  EQUIPMENT_UPDATED = 'equipment_updated',
  WORK_ORDER_CREATED = 'work_order_created',
  WORK_ORDER_COMPLETED = 'work_order_completed',
  INVITATION_SENT = 'invitation_sent',
  INVITATION_ACCEPTED = 'invitation_accepted',
  SETTINGS_UPDATED = 'settings_updated'
}

/**
 * Organization invitation creation data
 */
export interface CreateInvitationData {
  email: string;
  role: OrganizationRole;
  message?: string;
  expires_in_days?: number;
}

/**
 * Organization member update data
 */
export interface UpdateMemberData {
  role?: OrganizationRole;
  status?: MemberStatus;
  permissions?: string[];
}

/**
 * Organization bulk operations
 */
export interface OrganizationBulkUpdateData {
  member_ids: string[];
  updates: Partial<UpdateMemberData>;
  updated_by: string;
}

/**
 * Organization search result
 */
export interface OrganizationSearchResult extends Organization {
  relevance_score?: number;
  matched_fields?: string[];
}

/**
 * Organization usage analytics
 */
export interface OrganizationUsageAnalytics {
  period: 'daily' | 'weekly' | 'monthly';
  start_date: string;
  end_date: string;
  work_orders_created: number;
  work_orders_completed: number;
  equipment_added: number;
  members_added: number;
  storage_used_bytes: number;
  api_calls: number;
  active_users: number;
  by_day: Array<{
    date: string;
    work_orders: number;
    equipment: number;
    members: number;
    storage_bytes: number;
  }>;
}

/**
 * Organization billing information
 */
export interface OrganizationBilling {
  organization_id: string;
  subscription_plan: SubscriptionPlan;
  subscription_status: SubscriptionStatus;
  current_period_start: string;
  current_period_end: string;
  trial_ends_at?: string;
  billing_email: string;
  payment_method?: {
    type: 'card' | 'bank_account';
    last4: string;
    brand?: string;
  };
  next_invoice_date?: string;
  amount_due_cents: number;
  amount_due_dollars: number;
  currency: string;
  billing_address?: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    country: string;
    postal_code: string;
  };
}

/**
 * Organization limits and quotas
 */
export interface OrganizationLimits {
  max_members: number;
  max_equipment: number;
  max_work_orders_per_month: number;
  max_storage_bytes: number;
  max_api_calls_per_month: number;
  max_teams: number;
  features: string[];
  restrictions: string[];
}
