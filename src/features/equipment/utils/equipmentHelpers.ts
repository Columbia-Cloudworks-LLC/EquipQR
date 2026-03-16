interface Equipment {
  id: string;
  name: string;
  manufacturer: string;
  model: string;
  serial_number: string;
  status: string;
  location: string;
  last_maintenance?: string;
  image_url?: string;
}

export type EquipmentStatus = 'active' | 'maintenance' | 'inactive' | 'out_of_service';

export interface StatusDisplayInfo {
  label: string;
  badgeClassName: string;
  textClassName: string;
}

/**
 * Canonical status options for equipment.
 * Use this constant to avoid duplicate definitions across components.
 */
export const EQUIPMENT_STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'maintenance', label: 'Under Maintenance' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'out_of_service', label: 'Out of Service' },
] as const;

/**
 * Returns Tailwind classes for equipment status badges using CSS variables
 * from the design system for dark mode and org branding support.
 */
export const getStatusColor = (status: string): string => {
  switch (status) {
    case 'active':
      return 'bg-success/10 text-success border-success/20';
    case 'maintenance':
      return 'bg-warning/10 text-warning border-warning/20';
    case 'inactive':
      return 'bg-muted text-muted-foreground border-border';
    case 'out_of_service':
      return 'bg-warning/10 text-warning border-warning/20';
    default:
      return 'bg-muted text-muted-foreground border-border';
  }
};

/**
 * Returns Tailwind classes for equipment status text (for icons, inline text).
 * Use this when you need just the text color without badge background.
 */
export const getStatusTextColor = (status: string): string => {
  switch (status) {
    case 'active':
      return 'text-success';
    case 'maintenance':
      return 'text-warning';
    case 'inactive':
      return 'text-muted-foreground';
    case 'out_of_service':
      return 'text-warning';
    default:
      return 'text-muted-foreground';
  }
};

/**
 * Returns full display information for a status, including label and all styling variants.
 * Use this when you need both the human-readable label and styling classes.
 */
export const getStatusDisplayInfo = (status: string): StatusDisplayInfo => {
  const option = EQUIPMENT_STATUS_OPTIONS.find((opt) => opt.value === status);
  return {
    label: option?.label || 'Active',
    badgeClassName: getStatusColor(status),
    textClassName: getStatusTextColor(status),
  };
};

export const filterEquipment = (
  equipment: Equipment[],
  searchQuery: string,
  statusFilter: string
): Equipment[] => {
  return equipment.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.manufacturer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.model.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.serial_number.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'out_of_service'
        ? item.status === 'maintenance' || item.status === 'inactive'
        : item.status === statusFilter);
    return matchesSearch && matchesStatus;
  });
};

/**
 * Formats a date string for use in HTML date inputs (YYYY-MM-DD format).
 * Returns empty string if the date is invalid or null.
 */
export const formatDateForInput = (dateString: string | null): string => {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return '';
    return date.toISOString().split('T')[0];
  } catch {
    return '';
  }
};

/**
 * Safely formats a date for display. Returns null if invalid.
 */
export const safeFormatDate = (value: string): string | null => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toLocaleDateString();
};
