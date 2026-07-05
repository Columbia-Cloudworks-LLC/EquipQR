import type { TeamWithMembers } from '@/features/teams/services/teamService';
import type { PlaceLocationData } from '@/components/ui/GooglePlacesAutocomplete';

export function buildTeamAddress(team: Pick<
  TeamWithMembers,
  'location_address' | 'location_city' | 'location_state' | 'location_country'
>): string {
  return [
    team.location_address,
    team.location_city,
    team.location_state,
    team.location_country,
  ]
    .filter(Boolean)
    .join(', ');
}

export function teamLocationToPlaceData(team: TeamWithMembers): PlaceLocationData | null {
  const formattedAddress = buildTeamAddress(team);
  const hasCoords = team.location_lat != null && team.location_lng != null;

  if (!hasCoords && !formattedAddress) {
    return null;
  }

  return {
    formatted_address: formattedAddress || 'Team location',
    street: team.location_address ?? '',
    city: team.location_city ?? '',
    state: team.location_state ?? '',
    country: team.location_country ?? '',
    lat: team.location_lat ?? undefined,
    lng: team.location_lng ?? undefined,
  };
}
