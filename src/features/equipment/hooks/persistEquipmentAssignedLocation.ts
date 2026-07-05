import { toast } from 'sonner';
import type { PlaceLocationData } from '@/components/ui/GooglePlacesAutocomplete';
import { logEquipmentLocationChange } from '@/features/equipment/services/equipmentLocationHistoryService';
import type { Tables } from '@/integrations/supabase/types';

type EquipmentUpdatePayload = Partial<Tables<'equipment'>>;

type UpdateEquipmentMutateAsync = (args: {
  id: string;
  data: EquipmentUpdatePayload;
}) => Promise<unknown>;

export async function persistEquipmentAssignedLocation(
  equipmentId: string,
  data: PlaceLocationData,
  mutateAsync: UpdateEquipmentMutateAsync,
): Promise<void> {
  await mutateAsync({
    id: equipmentId,
    data: {
      assigned_location_street: data.street || null,
      assigned_location_city: data.city || null,
      assigned_location_state: data.state || null,
      assigned_location_country: data.country || null,
      assigned_location_lat: data.lat ?? null,
      assigned_location_lng: data.lng ?? null,
      use_team_location: false,
    },
  });

  await logEquipmentLocationChange({
    equipmentId,
    source: 'manual',
    latitude: data.lat ?? null,
    longitude: data.lng ?? null,
    addressStreet: data.street ?? null,
    addressCity: data.city ?? null,
    addressState: data.state ?? null,
    addressCountry: data.country ?? null,
    formattedAddress: data.formatted_address || undefined,
  });

  toast.success('Equipment location updated successfully');
}
