/**
 * Equipment Types - Consolidated type definitions
 * 
 * This file serves as the single source of truth for equipment types.
 * Import from here instead of defining types locally in components/hooks.
 */

import { z } from 'zod';
import { Tables } from '@/integrations/supabase/types';

// ============================================
// Core Status Type
// ============================================

export type EquipmentStatus = 'active' | 'maintenance' | 'inactive';

// ============================================
// Location Types
// ============================================

export interface EquipmentLocation {
  latitude: number;
  longitude: number;
  address?: string;
  timestamp?: string;
}

// ============================================
// Custom Attributes Type
// ============================================

export type CustomAttributes = Record<string, string | number | boolean | null>;

// ============================================
// Zod Schemas for Validation
// ============================================

// Custom attributes schema for better type safety
const customAttributesSchema = z.record(z.string(), z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null()
])).optional();

// Location schema for last_known_location
const locationSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  address: z.string().optional(),
  timestamp: z.string().optional()
}).optional();

// Context for role-based validation
export interface EquipmentValidationContext {
  userRole: 'owner' | 'admin' | 'manager' | 'member';
  isOrgAdmin: boolean;
  teamMemberships: Array<{ teamId: string; role: string }>;
}

export const equipmentFormSchema = z.object({
  name: z.string().min(1, "Equipment name is required"),
  manufacturer: z.string().min(1, "Manufacturer is required"),
  model: z.string().min(1, "Model is required"),
  serial_number: z.string().min(1, "Serial number is required"),
  status: z.enum(['active', 'maintenance', 'inactive']),
  location: z.string().min(1, "Location is required"),
  installation_date: z.string(),
  warranty_expiration: z.string().optional(),
  last_maintenance: z.string().optional(),
  notes: z.string(),
  custom_attributes: customAttributesSchema,
  image_url: z.string().optional(),
  last_known_location: locationSchema,
  team_id: z.string().optional(),
  default_pm_template_id: z.string().optional()
});

// Function to create context-aware validation
export const createEquipmentValidationSchema = (context?: EquipmentValidationContext) => {
  return equipmentFormSchema.refine((data) => {
    // If no context provided, skip team validation (for backward compatibility)
    if (!context) return true;
    
    // Org admins and owners can create equipment without team assignment
    if (context.isOrgAdmin || context.userRole === 'owner') {
      return true;
    }
    
    // Non-admin users must assign equipment to a team they manage
    if (!data.team_id) {
      return false;
    }
    
    // Validate user can manage the assigned team
    const canManageTeam = context.teamMemberships.some(
      membership => membership.teamId === data.team_id && 
      (membership.role === 'manager' || membership.role === 'admin')
    );
    
    return canManageTeam;
  }, {
    message: "You must assign equipment to a team you manage",
    path: ["team_id"]
  });
};

export type EquipmentFormData = z.infer<typeof equipmentFormSchema>;

// ============================================
// Equipment Record Types
// ============================================

/**
 * Base equipment row type from Supabase database
 * This is the raw database type with Json fields
 */
type EquipmentRow = Tables<'equipment'>;

/**
 * Strongly-typed Equipment record used across forms and pages
 * 
 * Extends the Supabase database row type with:
 * - Type-safe transformations for Json fields (custom_attributes, last_known_location)
 * - Frontend-specific computed fields from joins (team_name)
 * 
 * This is the primary type for equipment data throughout the application.
 */
export interface EquipmentRecord extends Omit<EquipmentRow, 'custom_attributes' | 'last_known_location'> {
  // Transform Json fields to type-safe interfaces
  custom_attributes?: CustomAttributes | null;
  last_known_location?: EquipmentLocation | null;
  
  // Frontend-specific computed fields from joins
  team_name?: string;
}

/**
 * Equipment with team information (from joins)
 * @deprecated Use EquipmentRecord directly - it now includes team_name
 */
export interface EquipmentWithTeam extends EquipmentRecord {
  team_name?: string;
}

// ============================================
// Equipment Filter Types
// ============================================

export interface EquipmentFilters {
  status?: EquipmentStatus;
  location?: string;
  manufacturer?: string;
  model?: string;
  team_id?: string | null;
  search?: string;
  // Team-based access control
  userTeamIds?: string[];
  isOrgAdmin?: boolean;
}

// ============================================
// Equipment Note Types
// ============================================

export interface EquipmentNote {
  id: string;
  equipment_id: string;
  author_id: string;
  content: string;
  is_private: boolean;
  created_at: string;
  updated_at: string;
  authorName?: string;
}

// ============================================
// Equipment Scan Types
// ============================================

export interface EquipmentScan {
  id: string;
  equipment_id: string;
  scanned_by: string;
  scanned_at: string;
  location?: string | null;
  notes?: string | null;
  scannedByName?: string;
}