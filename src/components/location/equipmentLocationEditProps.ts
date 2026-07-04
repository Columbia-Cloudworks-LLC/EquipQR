import type { PlaceLocationData } from '@/components/ui/GooglePlacesAutocomplete';

export type EquipmentLocationEditProps = {
  canEditLocation?: boolean;
  isEditingAddress?: boolean;
  isSavingAddress?: boolean;
  isPlacesLoaded?: boolean;
  onStartAddressEdit?: () => void;
  onCancelAddressEdit?: () => void;
  onSaveAddress?: (data: PlaceLocationData) => Promise<void>;
};
