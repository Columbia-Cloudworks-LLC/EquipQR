import { useQuery } from '@tanstack/react-query';
import { getTeamImageUrl } from '@/features/teams/services/teamService';
import { useOrganization } from '@/contexts/OrganizationContext';
import {
  DEFAULT_SIGNED_URL_TTL_SECONDS,
  displayUrlForStoredPrivateImage,
  resolveImageDisplayUrl,
} from '@/services/imageUploadService';
import { team } from '@/lib/queryKeys';
import {
  UNASSIGNED_TEAM_ID,
  type SelectedTeamId,
} from '@/contexts/selected-team-context';

/** Refresh before default TTL so cached signed URLs do not expire mid-session. */
const TEAM_IMAGE_SIGNED_URL_REFRESH_MS = Math.max(
  60_000,
  (DEFAULT_SIGNED_URL_TTL_SECONDS - 120) * 1000,
);

/**
 * Resolve a signed display URL for the selected team's uploaded image.
 * Returns null for All teams / Unassigned / missing image (TopBar keeps Users icon).
 */
export function useSelectedTeamImageUrl(selectedTeamId: SelectedTeamId) {
  const { organizationId } = useOrganization();
  const teamId =
    selectedTeamId && selectedTeamId !== UNASSIGNED_TEAM_ID
      ? selectedTeamId
      : null;

  return useQuery({
    queryKey: team(teamId ?? 'none').displayImage(),
    enabled: Boolean(teamId && organizationId),
    queryFn: async (): Promise<string | null> => {
      if (!teamId || !organizationId) return null;

      const raw = (await getTeamImageUrl(teamId, organizationId))?.trim();
      if (!raw) return null;

      const signed = await resolveImageDisplayUrl('team-images', raw);
      return displayUrlForStoredPrivateImage(signed, raw);
    },
    staleTime: TEAM_IMAGE_SIGNED_URL_REFRESH_MS,
    gcTime: TEAM_IMAGE_SIGNED_URL_REFRESH_MS * 2,
    refetchInterval: TEAM_IMAGE_SIGNED_URL_REFRESH_MS,
  });
}
