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
    default:
      return 'bg-muted text-muted-foreground border-border';
  }
};

export const filterEquipment = (
  equipment: Equipment[],
  searchQuery: string,
  statusFilter: string
): Equipment[] => {
  return equipment.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.manufacturer.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.model.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.serial_number.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });
};