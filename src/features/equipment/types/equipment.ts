/**
 * Equipment Types - Consolidated type definitions
 * 
 * This file serves as the single source of truth for equipment types.
 * Import from here instead of defining types locally in components/hooks.
 */

import { z } from 'zod';
import type { Json, Tables } from '@/integrations/supabase/types';

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

/**
 * Narrow a raw `custom_attributes` Json column to `CustomAttributes`.
 * Non-object values yield an empty record; nested (non-scalar) values are dropped.
 */
export const parseCustomAttributes = (value: Json | null | undefined): CustomAttributes => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const result: CustomAttributes = {};
  for (const [key, entry] of Object.entries(value)) {
    if (
      typeof entry === 'string' ||
      typeof entry === 'number' ||
      typeof entry === 'boolean' ||
      entry === null
    ) {
      result[key] = entry;
    }
  }
  return result;
};

/**
 * Narrow a raw `last_known_location` Json column to `EquipmentLocation`.
 * Returns undefined unless numeric latitude/longitude are present.
 */
export const parseEquipmentLocation = (
  value: Json | null | undefined
): EquipmentLocation | undefined => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const { latitude, longitude, address, timestamp } = value;
  if (typeof latitude !== 'number' || typeof longitude !== 'number') return undefined;
  return {
    latitude,
    longitude,
    ...(typeof address === 'string' ? { address } : {}),
    ...(typeof timestamp === 'string' ? { timestamp } : {}),
  };
};

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
  default_pm_template_id: z.string().optional(),
  // Mirrors `quickEquipmentSchema.working_hours` — required for partial-update
  // validation in the bulk-edit grid (#627) so hour edits can't bypass the
  // non-negative constraint by routing through `equipmentFormSchema.partial()`.
  working_hours: z.number().min(0, "Working hours cannot be negative").optional().nullable(),
  assigned_location_street: z.string().optional(),
  assigned_location_city: z.string().optional(),
  assigned_location_state: z.string().optional(),
  assigned_location_country: z.string().optional(),
  assigned_location_lat: z.number().optional(),
  assigned_location_lng: z.number().optional(),
  use_team_location: z.boolean().optional()
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

    // Non-admin users must assign equipment to a team where they hold a
    // create-capable role (manager or technician) — issue #650. The
    // historical 'admin' team role is kept for backward compatibility with
    // any seeded fixture data, but no team currently issues that role.
    if (!data.team_id) {
      return false;
    }

    const canCreateForTeam = context.teamMemberships.some(
      membership => membership.teamId === data.team_id &&
        (membership.role === 'manager' || membership.role === 'technician' || membership.role === 'admin')
    );

    return canCreateForTeam;
  }, {
    message: "You must assign equipment to a team where you can create equipment (manager or technician)",
    path: ["team_id"]
  });
};

export type EquipmentFormData = z.infer<typeof equipmentFormSchema>;

// ============================================
// Quick Equipment Schema (Minimal for inline creation)
// ============================================

/**
 * Quick Equipment Schema - Minimal validation for inline equipment creation
 * 
 * Used when technicians create equipment during work order creation.
 * Only requires essential fields; name is auto-generated but editable.
 */
export const quickEquipmentSchema = z.object({
  manufacturer: z.string().min(1, "Manufacturer is required"),
  model: z.string().min(1, "Model is required"),
  serial_number: z.string().min(1, "Serial number is required"),
  working_hours: z.number().min(0, "Working hours cannot be negative").optional().nullable(),
  team_id: z.string().min(1, "Team is required"),
  name: z.string().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
});

export type QuickEquipmentFormData = z.infer<typeof quickEquipmentSchema>;

/**
 * Generate default equipment name from manufacturer and model
 */
export const generateEquipmentName = (manufacturer: string, model: string): string => {
  const mfr = manufacturer.trim();
  const mdl = model.trim();
  if (!mfr && !mdl) return '';
  if (!mfr) return mdl;
  if (!mdl) return mfr;
  return `${mfr} ${mdl}`;
};

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
export interface EquipmentRecord extends Omit<
  EquipmentRow,
  | 'custom_attributes'
  | 'last_known_location'
  | 'assigned_location_street'
  | 'assigned_location_city'
  | 'assigned_location_state'
  | 'assigned_location_country'
  | 'assigned_location_lat'
  | 'assigned_location_lng'
  | 'use_team_location'
> {
  // Json columns stay `Json` here because rows come straight from Supabase;
  // use `parseCustomAttributes` / `parseEquipmentLocation` to narrow them.
  custom_attributes?: Json | null;
  last_known_location?: Json | null;
  
  // Frontend-specific computed fields from joins
  team_name?: string;
  
  // Assigned location fields
  assigned_location_street?: string | null;
  assigned_location_city?: string | null;
  assigned_location_state?: string | null;
  assigned_location_country?: string | null;
  assigned_location_lat?: number | null;
  assigned_location_lng?: number | null;
  use_team_location?: boolean;
}
