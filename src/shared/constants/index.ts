/**
 * Application constants
 * Centralized location for all hardcoded values and configuration
 */

// API Endpoints
export const API_ENDPOINTS = {
  WORK_ORDERS: 'work_orders',
  EQUIPMENT: 'equipment',
  TEAMS: 'teams',
  ORGANIZATIONS: 'organizations',
  PROFILES: 'profiles',
  WORK_ORDER_COSTS: 'work_order_costs',
  WORK_ORDER_NOTES: 'work_order_notes',
  EQUIPMENT_NOTES: 'equipment_notes',
  EQUIPMENT_IMAGES: 'equipment_images',
  WORK_ORDER_IMAGES: 'work_order_images',
  ORGANIZATION_MEMBERS: 'organization_members',
  ORGANIZATION_INVITATIONS: 'organization_invitations',
  PM_TEMPLATES: 'pm_templates',
  PM_CHECKLISTS: 'pm_checklists',
} as const;

// Table names for direct use
export const WORK_ORDERS = 'work_orders';
export const WORK_ORDER_COSTS = 'work_order_costs';
export const WORK_ORDER_NOTES = 'work_order_notes';
export const EQUIPMENT = 'equipment';
export const EQUIPMENT_NOTES = 'equipment_notes';
export const ORGANIZATIONS = 'organizations';

// Query Keys for React Query
export const QUERY_KEYS = {
  WORK_ORDERS: 'work-orders',
  WORK_ORDER_DETAILS: 'work-order-details',
  WORK_ORDER_COSTS: 'work-order-costs',
  WORK_ORDER_NOTES: 'work-order-notes',
  EQUIPMENT: 'equipment',
  EQUIPMENT_DETAILS: 'equipment-details',
  EQUIPMENT_NOTES: 'equipment-notes',
  EQUIPMENT_IMAGES: 'equipment-images',
  TEAMS: 'teams',
  TEAM_DETAILS: 'team-details',
  ORGANIZATIONS: 'organizations',
  ORGANIZATION_DETAILS: 'organization-details',
  ORGANIZATION_MEMBERS: 'organization-members',
  ORGANIZATION_INVITATIONS: 'organization-invitations',
  PROFILES: 'profiles',
  PM_TEMPLATES: 'pm-templates',
  PM_CHECKLISTS: 'pm-checklists',
  BILLING: 'billing',
  NOTIFICATIONS: 'notifications',
} as const;

// Status Values
export const WORK_ORDER_STATUS = {
  SUBMITTED: 'submitted',
  ACCEPTED: 'accepted',
  ASSIGNED: 'assigned',
  IN_PROGRESS: 'in_progress',
  ON_HOLD: 'on_hold',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;

export const EQUIPMENT_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  MAINTENANCE: 'maintenance',
  RETIRED: 'retired',
} as const;

export const TEAM_ROLE = {
  ADMIN: 'admin',
  MEMBER: 'member',
  VIEWER: 'viewer',
} as const;

export const ORGANIZATION_ROLE = {
  OWNER: 'owner',
  ADMIN: 'admin',
  MEMBER: 'member',
  VIEWER: 'viewer',
} as const;

// Priority Levels
export const PRIORITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'urgent',
} as const;

// Pagination Defaults
export const PAGINATION_DEFAULTS = {
  PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  DEFAULT_PAGE: 1,
} as const;

// File Upload Limits
export const FILE_UPLOAD_LIMITS = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_IMAGE_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  ALLOWED_DOCUMENT_TYPES: ['application/pdf', 'text/plain', 'application/msword'],
} as const;

// Validation Messages
export const VALIDATION_MESSAGES = {
  REQUIRED: 'This field is required',
  EMAIL_INVALID: 'Please enter a valid email address',
  PASSWORD_TOO_SHORT: 'Password must be at least 8 characters',
  PASSWORD_MISMATCH: 'Passwords do not match',
  PHONE_INVALID: 'Please enter a valid phone number',
  URL_INVALID: 'Please enter a valid URL',
  DATE_INVALID: 'Please enter a valid date',
  NUMBER_INVALID: 'Please enter a valid number',
  FILE_TOO_LARGE: 'File size exceeds maximum allowed size',
  FILE_TYPE_INVALID: 'File type is not allowed',
} as const;

// Toast Messages
export const TOAST_MESSAGES = {
  SUCCESS: {
    SAVED: 'Changes saved successfully',
    CREATED: 'Item created successfully',
    UPDATED: 'Item updated successfully',
    DELETED: 'Item deleted successfully',
    ASSIGNED: 'Assignment completed successfully',
    ACCEPTED: 'Work order accepted successfully',
    COMPLETED: 'Work order completed successfully',
  },
  ERROR: {
    SAVE_FAILED: 'Failed to save changes',
    CREATE_FAILED: 'Failed to create item',
    UPDATE_FAILED: 'Failed to update item',
    DELETE_FAILED: 'Failed to delete item',
    LOAD_FAILED: 'Failed to load data',
    NETWORK_ERROR: 'Network error occurred',
    PERMISSION_DENIED: 'Permission denied',
    VALIDATION_ERROR: 'Please check your input',
  },
  INFO: {
    LOADING: 'Loading...',
    SAVING: 'Saving...',
    PROCESSING: 'Processing...',
  },
} as const;

// Date Formats
export const DATE_FORMATS = {
  DISPLAY: 'MMM dd, yyyy',
  DISPLAY_WITH_TIME: 'MMM dd, yyyy h:mm a',
  API: 'yyyy-MM-dd',
  API_WITH_TIME: "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'",
  SHORT: 'MM/dd/yyyy',
  LONG: 'EEEE, MMMM do, yyyy',
} as const;

// Storage Keys
export const STORAGE_KEYS = {
  USER_PREFERENCES: 'user-preferences',
  THEME: 'theme',
  LANGUAGE: 'language',
  RECENT_ORGANIZATIONS: 'recent-organizations',
  DRAFT_WORK_ORDER: 'draft-work-order',
  DRAFT_EQUIPMENT: 'draft-equipment',
  CACHE_PREFIX: 'equipqr-cache-',
} as const;

// Cache TTL (Time To Live) in milliseconds
export const CACHE_TTL = {
  SHORT: 5 * 60 * 1000, // 5 minutes
  MEDIUM: 30 * 60 * 1000, // 30 minutes
  LONG: 2 * 60 * 60 * 1000, // 2 hours
  VERY_LONG: 24 * 60 * 60 * 1000, // 24 hours
} as const;

// Feature Flags
export const FEATURE_FLAGS = {
  ENABLE_BILLING: process.env.VITE_ENABLE_BILLING === 'true',
  ENABLE_FLEET_MAP: process.env.VITE_ENABLE_FLEET_MAP === 'true',
  ENABLE_NOTIFICATIONS: process.env.VITE_ENABLE_NOTIFICATIONS === 'true',
  ENABLE_ANALYTICS: process.env.VITE_ENABLE_ANALYTICS === 'true',
  ENABLE_DEBUG_MODE: process.env.NODE_ENV === 'development',
} as const;

// API Configuration
export const API_CONFIG = {
  TIMEOUT: 30000, // 30 seconds
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000, // 1 second
  STALE_TIME: 5 * 60 * 1000, // 5 minutes
  CACHE_TIME: 10 * 60 * 1000, // 10 minutes
} as const;

// UI Constants
export const UI_CONSTANTS = {
  DEBOUNCE_DELAY: 300, // milliseconds
  ANIMATION_DURATION: 200, // milliseconds
  TOAST_DURATION: 4000, // milliseconds
  MODAL_ANIMATION_DURATION: 150, // milliseconds
  INFINITE_SCROLL_THRESHOLD: 100, // pixels
  VIRTUAL_LIST_ITEM_HEIGHT: 60, // pixels
} as const;

// Error Codes
export const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  RATE_LIMIT: 'RATE_LIMIT',
  NETWORK_ERROR: 'NETWORK_ERROR',
  SERVER_ERROR: 'SERVER_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;
