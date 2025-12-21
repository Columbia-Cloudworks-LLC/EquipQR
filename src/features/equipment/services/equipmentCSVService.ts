import { saveAs } from 'file-saver';
import { format } from 'date-fns';
import { EquipmentRecord } from '@/features/equipment/types/equipment';

interface Team {
  id: string;
  name: string;
}

interface EquipmentCSVData extends Omit<EquipmentRecord, 'custom_attributes'> {
  custom_attributes: Record<string, string | number | boolean | null>;
}

export const generateEquipmentCSV = (
  equipment: EquipmentCSVData[],
  teams: Team[],
  organizationName: string
): void => {
  if (!equipment.length) {
    return;
  }

  // Create team lookup map
  const teamMap = new Map(teams.map(team => [team.id, team.name]));

  // Extract all unique custom attribute keys
  const customAttributeKeys = new Set<string>();
  equipment.forEach(item => {
    if (item.custom_attributes && typeof item.custom_attributes === 'object') {
      Object.keys(item.custom_attributes).forEach(key => {
        customAttributeKeys.add(key);
      });
    }
  });

  // Define standard columns
  const standardColumns = [
    'Name',
    'Manufacturer',
    'Model',
    'Serial Number',
    'Location',
    'Assigned Team',
    'Status',
    'Description',
    'Created Date',
    'Installation Date',
    'Last Maintenance',
    'Working Hours',
    'URL'
  ];

  // Combine headers: standard + custom attributes
  const headers = [...standardColumns, ...Array.from(customAttributeKeys)];

  // Helper function to escape CSV values
  const escapeCSVValue = (value: unknown): string => {
    if (value === null || value === undefined) {
      return '';
    }
    
    const stringValue = String(value);
    
    // If the value contains comma, quote, or newline, wrap in quotes and escape quotes
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }
    
    return stringValue;
  };

  // Helper function to format dates
  const formatDate = (dateString: string | null): string => {
    if (!dateString) return '';
    try {
      return format(new Date(dateString), 'yyyy-MM-dd');
    } catch {
      return dateString;
    }
  };

  // Generate CSV rows
  const csvRows = [
    headers.join(','), // Header row
    ...equipment.map(item => {
      const standardValues = [
        item.name || '',
        item.manufacturer || '',
        item.model || '',
        item.serial_number || '',
        item.location || '',
        item.team_id ? (teamMap.get(item.team_id) || 'Unknown Team') : 'Unassigned',
        item.status || '',
        item.notes || '',
        formatDate(item.created_at),
        formatDate(item.installation_date),
        formatDate(item.last_maintenance),
        item.working_hours ? String(item.working_hours) : '0',
        `${window.location.origin}/dashboard/equipment/${item.id}`
      ];

      // Add custom attribute values
      const customAttributeValues = Array.from(customAttributeKeys).map(key => {
        const customAttrs = item.custom_attributes || {};
        return customAttrs[key] !== undefined ? customAttrs[key] : '';
      });

      const allValues = [...standardValues, ...customAttributeValues];
      return allValues.map(escapeCSVValue).join(',');
    })
  ];

  // Create CSV content
  const csvContent = csvRows.join('\n');

  // Generate timestamp for filename
  const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm-ss');
  
  // Sanitize organization name for filename
  const sanitizedOrgName = organizationName.replace(/[^a-zA-Z0-9_-]/g, '_');
  
  const filename = `${sanitizedOrgName}_Equipment_${timestamp}.csv`;

  // Create and download the file
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  saveAs(blob, filename);
};

export const exportEquipmentCSV = (
  equipment: EquipmentCSVData[],
  teams: Team[],
  organizationName: string
): Promise<void> => {
  return new Promise((resolve, reject) => {
    try {
      generateEquipmentCSV(equipment, teams, organizationName);
      resolve();
    } catch (error) {
      reject(error);
    }
  });
};