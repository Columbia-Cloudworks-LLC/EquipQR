/**
 * Equipment domain types
 * Consolidated from scattered equipment interfaces
 * Following SOLID principles with clear inheritance hierarchy
 */

import { BaseEntity, AuditableEntity, BaseNote, BaseImage, EntityStatus, Priority } from '@/shared/types/common';

/**
 * Core Equipment entity
 */
export interface Equipment extends AuditableEntity {
  name: string;
  description?: string;
  equipment_type: string;
  model?: string;
  serial_number?: string;
  manufacturer?: string;
  organization_id: string;
  team_id?: string;
  status: EquipmentStatus;
  location?: string;
  purchase_date?: string;
  warranty_expiry?: string;
  purchase_price_cents?: number;
  current_value_cents?: number;
  maintenance_interval_days?: number;
  last_maintenance_date?: string;
  next_maintenance_date?: string;
  total_hours_worked?: number;
  pm_template_id?: string;
  custom_attributes?: Record<string, any>;
  
  // Computed fields
  team_name?: string;
  is_overdue_maintenance?: boolean;
  days_since_last_maintenance?: number;
  purchase_price_dollars?: number;
  current_value_dollars?: number;
}

/**
 * Equipment status enum
 */
export enum EquipmentStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  MAINTENANCE = 'maintenance',
  RETIRED = 'retired',
  OUT_OF_SERVICE = 'out_of_service'
}

/**
 * Equipment filters for queries
 */
export interface EquipmentFilters {
  status?: EquipmentStatus | 'all';
  teamId?: string;
  equipmentType?: string;
  manufacturer?: string;
  location?: string;
  search?: string;
  hasMaintenanceOverdue?: boolean;
  pmTemplateId?: string;
  dateRange?: {
    start: string;
    end: string;
  };
  customAttributes?: Record<string, any>;
}

/**
 * Equipment creation data
 */
export interface CreateEquipmentData {
  name: string;
  description?: string;
  equipment_type: string;
  model?: string;
  serial_number?: string;
  manufacturer?: string;
  team_id?: string;
  status: EquipmentStatus;
  location?: string;
  purchase_date?: string;
  warranty_expiry?: string;
  purchase_price_cents?: number;
  current_value_cents?: number;
  maintenance_interval_days?: number;
  pm_template_id?: string;
  custom_attributes?: Record<string, any>;
}

/**
 * Equipment update data
 */
export interface UpdateEquipmentData {
  name?: string;
  description?: string;
  equipment_type?: string;
  model?: string;
  serial_number?: string;
  manufacturer?: string;
  team_id?: string;
  status?: EquipmentStatus;
  location?: string;
  purchase_date?: string;
  warranty_expiry?: string;
  purchase_price_cents?: number;
  current_value_cents?: number;
  maintenance_interval_days?: number;
  last_maintenance_date?: string;
  next_maintenance_date?: string;
  total_hours_worked?: number;
  pm_template_id?: string;
  custom_attributes?: Record<string, any>;
}

/**
 * Enhanced Equipment with related data
 */
export interface EnhancedEquipment extends Equipment {
  team?: {
    id: string;
    name: string;
  };
  pm_template?: {
    id: string;
    name: string;
    description?: string;
  };
  work_orders?: Array<{
    id: string;
    title: string;
    status: string;
    priority: string;
    created_date: string;
    due_date?: string;
  }>;
  notes?: EquipmentNote[];
  images?: EquipmentImage[];
  maintenance_history?: MaintenanceRecord[];
  custom_attributes_formatted?: Array<{
    key: string;
    value: any;
    label: string;
    type: string;
  }>;
}

/**
 * Equipment Note entity (extends BaseNote)
 */
export interface EquipmentNote extends BaseNote {
  equipment_id: string;
  images?: EquipmentNoteImage[];
}

/**
 * Equipment Note Image entity
 */
export interface EquipmentNoteImage extends BaseImage {
  equipment_id: string;
  note_id?: string;
}

/**
 * Equipment Image entity
 */
export interface EquipmentImage extends BaseImage {
  equipment_id: string;
  category?: 'general' | 'maintenance' | 'damage' | 'documentation';
  is_primary?: boolean;
}

/**
 * Maintenance Record entity
 */
export interface MaintenanceRecord extends AuditableEntity {
  equipment_id: string;
  maintenance_type: MaintenanceType;
  description: string;
  performed_by: string;
  performed_date: string;
  next_due_date?: string;
  cost_cents?: number;
  hours_worked?: number;
  notes?: string;
  attachments?: string[];
  
  // Computed fields
  performed_by_name?: string;
  cost_dollars?: number;
}

/**
 * Maintenance types
 */
export enum MaintenanceType {
  PREVENTIVE = 'preventive',
  CORRECTIVE = 'corrective',
  PREDICTIVE = 'predictive',
  EMERGENCY = 'emergency',
  INSPECTION = 'inspection'
}

/**
 * Equipment statistics
 */
export interface EquipmentStats {
  total_equipment: number;
  by_status: Record<EquipmentStatus, number>;
  by_type: Record<string, number>;
  by_team: Array<{
    team_id: string;
    team_name: string;
    count: number;
  }>;
  maintenance_overdue: number;
  total_value_cents: number;
  total_value_dollars: number;
  avg_maintenance_interval: number;
  equipment_with_work_orders: number;
}

/**
 * Equipment import data
 */
export interface EquipmentImportData {
  equipment: CreateEquipmentData[];
  imported_by: string;
  import_source?: string;
  validation_errors?: Array<{
    row: number;
    field: string;
    error: string;
  }>;
}

/**
 * Equipment bulk operations
 */
export interface EquipmentBulkUpdateData {
  equipment_ids: string[];
  updates: Partial<UpdateEquipmentData>;
  updated_by: string;
}

/**
 * Equipment search result
 */
export interface EquipmentSearchResult extends Equipment {
  relevance_score?: number;
  matched_fields?: string[];
}

/**
 * Equipment QR Code data
 */
export interface EquipmentQRData {
  equipment_id: string;
  organization_id: string;
  qr_code_url: string;
  qr_code_data: string;
  generated_at: string;
  expires_at?: string;
}

/**
 * Equipment working hours
 */
export interface EquipmentWorkingHours {
  equipment_id: string;
  date: string;
  hours_worked: number;
  operator_id: string;
  operator_name?: string;
  work_description?: string;
  work_order_id?: string;
}

/**
 * Equipment custom attribute definition
 */
export interface EquipmentCustomAttribute {
  id: string;
  equipment_id: string;
  attribute_name: string;
  attribute_value: any;
  attribute_type: 'text' | 'number' | 'date' | 'boolean' | 'select';
  is_required: boolean;
  options?: string[]; // For select type
  created_at: string;
  updated_at: string;
}
