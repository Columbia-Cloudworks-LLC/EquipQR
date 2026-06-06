export interface EquipmentLocation {
  id: string;
  name: string;
  manufacturer: string;
  model: string;
  serial_number: string;
  lat: number;
  lng: number;
  source: 'equipment' | 'geocoded' | 'scan' | 'team';
  formatted_address?: string;
  working_hours?: number;
  last_maintenance?: string;
  image_url?: string;
  location_updated_at?: string;
  team_id?: string | null;
  team_name?: string;
}

export interface TeamHQLocation {
  id: string;
  name: string;
  lat: number;
  lng: number;
  formatted_address?: string;
}
