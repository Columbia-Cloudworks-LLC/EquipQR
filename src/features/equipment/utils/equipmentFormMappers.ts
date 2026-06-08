import type { EquipmentFormData, EquipmentRecord } from '@/features/equipment/types/equipment';
import type { EquipmentCreateData, EquipmentUpdateData } from '@/features/equipment/services/EquipmentService';
import { mapEquipmentFormSharedFields } from '@/features/equipment/utils/equipmentFormSharedFields';

/** React Hook Form default values for create vs edit equipment flows. */
export function buildEquipmentFormDefaultValues(
  initialData?: EquipmentRecord,
): EquipmentFormData {
  if (initialData) {
    return {
      name: initialData.name,
      manufacturer: initialData.manufacturer,
      model: initialData.model,
      serial_number: initialData.serial_number,
      status: initialData.status,
      location: initialData.location,
      installation_date: initialData.installation_date,
      warranty_expiration: initialData.warranty_expiration || '',
      last_maintenance: initialData.last_maintenance || '',
      notes: initialData.notes || '',
      custom_attributes: initialData.custom_attributes || {},
      image_url: initialData.image_url || '',
      last_known_location: initialData.last_known_location || undefined,
      team_id: initialData.team_id || '',
      default_pm_template_id: initialData.default_pm_template_id || '',
      assigned_location_street: initialData.assigned_location_street || '',
      assigned_location_city: initialData.assigned_location_city || '',
      assigned_location_state: initialData.assigned_location_state || '',
      assigned_location_country: initialData.assigned_location_country || '',
      assigned_location_lat: initialData.assigned_location_lat || undefined,
      assigned_location_lng: initialData.assigned_location_lng || undefined,
    };
  }

  return {
    name: '',
    manufacturer: '',
    model: '',
    serial_number: '',
    status: 'active',
    location: '',
    installation_date: new Date().toISOString().split('T')[0],
    warranty_expiration: '',
    last_maintenance: '',
    notes: '',
    custom_attributes: {},
    image_url: '',
    last_known_location: undefined,
    team_id: '',
    default_pm_template_id: '',
    assigned_location_street: '',
    assigned_location_city: '',
    assigned_location_state: '',
    assigned_location_country: '',
    assigned_location_lat: undefined,
    assigned_location_lng: undefined,
  };
}

export function toEquipmentCreateData(data: EquipmentFormData): EquipmentCreateData {
  return {
    ...mapEquipmentFormSharedFields(data),
    customer_id: null,
    working_hours: 0,
    import_id: null,
  };
}

export function toEquipmentUpdateData(data: EquipmentFormData): EquipmentUpdateData {
  return mapEquipmentFormSharedFields(data);
}
