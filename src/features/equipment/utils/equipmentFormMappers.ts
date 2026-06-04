import type { EquipmentFormData, EquipmentRecord } from '@/features/equipment/types/equipment';
import type { EquipmentCreateData, EquipmentUpdateData } from '@/features/equipment/services/EquipmentService';

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
    name: data.name,
    manufacturer: data.manufacturer,
    model: data.model,
    serial_number: data.serial_number,
    status: data.status,
    location: data.location,
    installation_date: data.installation_date,
    customer_id: null,
    warranty_expiration: data.warranty_expiration || null,
    last_maintenance: data.last_maintenance || null,
    notes: data.notes || null,
    custom_attributes: (data.custom_attributes || {}) as Record<string, unknown>,
    image_url: data.image_url || null,
    last_known_location: data.last_known_location || null,
    team_id: data.team_id || null,
    default_pm_template_id: data.default_pm_template_id || null,
    assigned_location_street: data.assigned_location_street || null,
    assigned_location_city: data.assigned_location_city || null,
    assigned_location_state: data.assigned_location_state || null,
    assigned_location_country: data.assigned_location_country || null,
    assigned_location_lat: data.assigned_location_lat ?? null,
    assigned_location_lng: data.assigned_location_lng ?? null,
    working_hours: 0,
    import_id: null,
  };
}

export function toEquipmentUpdateData(data: EquipmentFormData): EquipmentUpdateData {
  return {
    name: data.name,
    manufacturer: data.manufacturer,
    model: data.model,
    serial_number: data.serial_number,
    status: data.status,
    location: data.location,
    installation_date: data.installation_date,
    warranty_expiration: data.warranty_expiration || null,
    last_maintenance: data.last_maintenance || null,
    notes: data.notes || null,
    custom_attributes: (data.custom_attributes || {}) as Record<string, unknown>,
    image_url: data.image_url || null,
    last_known_location: data.last_known_location || null,
    team_id: data.team_id || null,
    default_pm_template_id: data.default_pm_template_id || null,
    assigned_location_street: data.assigned_location_street || null,
    assigned_location_city: data.assigned_location_city || null,
    assigned_location_state: data.assigned_location_state || null,
    assigned_location_country: data.assigned_location_country || null,
    assigned_location_lat: data.assigned_location_lat ?? null,
    assigned_location_lng: data.assigned_location_lng ?? null,
  };
}

/** Supabase insert row for the legacy direct-create equipment form hook. */
export function toEquipmentSupabaseInsertRow(
  data: EquipmentFormData,
  organizationId: string,
) {
  const create = toEquipmentCreateData(data);
  return {
    ...create,
    organization_id: organizationId,
    last_maintenance_work_order_id: null,
  };
}
