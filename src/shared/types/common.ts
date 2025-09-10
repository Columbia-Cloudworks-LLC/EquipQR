/**
 * Common type definitions used across the application
 * Following SOLID principles with clear interfaces and inheritance
 */

/**
 * Base entity interface that all domain entities should extend
 * Provides common fields for database entities
 */
export interface BaseEntity {
  id: string;
  created_at: string;
  updated_at: string;
}

/**
 * Auditable entity interface for entities that track who created/modified them
 * Extends BaseEntity with audit fields
 */
export interface AuditableEntity extends BaseEntity {
  created_by: string;
  updated_by?: string;
  created_by_name?: string;
  updated_by_name?: string;
}

/**
 * Standardized API response format
 * Provides consistent structure for all service responses
 */
export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  success: boolean;
  message?: string;
}

/**
 * Pagination parameters for list queries
 * Standardizes pagination across all services
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  offset?: number;
}

/**
 * Generic filter parameters for queries
 * Allows flexible filtering while maintaining type safety
 */
export interface FilterParams {
  [key: string]: unknown;
}

/**
 * Base note interface for all note-like entities
 * Provides common structure for work order notes, equipment notes, etc.
 */
export interface BaseNote extends AuditableEntity {
  content: string;
  is_private: boolean;
  hours_worked: number;
}

/**
 * Base image interface for entities that support image attachments
 * Standardizes image handling across the application
 */
export interface BaseImage extends AuditableEntity {
  file_name: string;
  file_url: string;
  file_size?: number;
  mime_type?: string;
  description?: string;
}

/**
 * Status enum for entities that have status tracking
 * Standardizes status values across domains
 */
export enum EntityStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  PENDING = 'pending',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  DELETED = 'deleted'
}

/**
 * Priority levels for entities that support prioritization
 * Standardizes priority values across domains
 */
export enum Priority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent'
}

/**
 * Generic CRUD operations interface
 * Defines standard operations for all repositories
 */
export interface CrudOperations<TEntity, TCreateData, TUpdateData> {
  findById(id: string): Promise<TEntity | null>;
  findMany(filters?: FilterParams, pagination?: PaginationParams): Promise<TEntity[]>;
  create(data: TCreateData): Promise<TEntity>;
  update(id: string, data: TUpdateData): Promise<TEntity>;
  delete(id: string): Promise<void>;
  count(filters?: FilterParams): Promise<number>;
}

/**
 * Query options for advanced filtering and sorting
 * Provides flexible query capabilities
 */
export interface QueryOptions {
  filters?: FilterParams;
  pagination?: PaginationParams;
  includes?: string[];
  orderBy?: {
    field: string;
    direction: 'asc' | 'desc';
  }[];
}

/**
 * Result with pagination metadata
 * Standardizes paginated response format
 */
export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}
