import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UNASSIGNED_TEAM_ID } from '@/contexts/selected-team-context';
import { useSelectedTeamImageUrl } from './useSelectedTeamImageUrl';

const { mockGetTeamImageUrl, mockResolve, mockDisplay, mockOrganizationIdRef } = vi.hoisted(
  () => ({
    mockGetTeamImageUrl: vi.fn(),
    mockResolve: vi.fn(),
    mockDisplay: vi.fn(),
    mockOrganizationIdRef: { current: 'org-1' as string | null },
  }),
);

vi.mock('@/features/teams/services/teamService', () => ({
  getTeamImageUrl: (...args: unknown[]) => mockGetTeamImageUrl(...args),
}));

vi.mock('@/contexts/OrganizationContext', () => ({
  useOrganization: () => ({
    organizationId: mockOrganizationIdRef.current,
  }),
}));

vi.mock('@/services/imageUploadService', () => ({
  DEFAULT_SIGNED_URL_TTL_SECONDS: 900,
  resolveImageDisplayUrl: (...args: unknown[]) => mockResolve(...args),
  displayUrlForStoredPrivateImage: (...args: unknown[]) => mockDisplay(...args),
}));

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useSelectedTeamImageUrl', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOrganizationIdRef.current = 'org-1';
  });

  it('does not query for All teams or Unassigned', () => {
    const { result: allTeams } = renderHook(() => useSelectedTeamImageUrl(null), {
      wrapper,
    });
    expect(allTeams.current.fetchStatus).toBe('idle');

    const { result: unassigned } = renderHook(
      () => useSelectedTeamImageUrl(UNASSIGNED_TEAM_ID),
      { wrapper },
    );
    expect(unassigned.current.fetchStatus).toBe('idle');
    expect(mockGetTeamImageUrl).not.toHaveBeenCalled();
  });

  it('does not query when organizationId is missing', () => {
    mockOrganizationIdRef.current = null;

    const { result } = renderHook(
      () => useSelectedTeamImageUrl('880e8400-e29b-41d4-a716-446655440000'),
      { wrapper },
    );

    expect(result.current.fetchStatus).toBe('idle');
    expect(mockGetTeamImageUrl).not.toHaveBeenCalled();
  });

  it('resolves a signed display URL for a selected team with an image', async () => {
    mockGetTeamImageUrl.mockResolvedValue('org/team/image.png');
    mockResolve.mockResolvedValue('https://signed.example/team.png');
    mockDisplay.mockReturnValue('https://signed.example/team.png');

    const { result } = renderHook(
      () => useSelectedTeamImageUrl('880e8400-e29b-41d4-a716-446655440000'),
      { wrapper },
    );

    await waitFor(() => {
      expect(result.current.data).toBe('https://signed.example/team.png');
    });
    expect(mockGetTeamImageUrl).toHaveBeenCalledWith(
      '880e8400-e29b-41d4-a716-446655440000',
      'org-1',
    );
    expect(mockResolve).toHaveBeenCalledWith('team-images', 'org/team/image.png');
  });

  it('returns null when the selected team has no image_url', async () => {
    mockGetTeamImageUrl.mockResolvedValue(null);

    const { result } = renderHook(
      () => useSelectedTeamImageUrl('880e8400-e29b-41d4-a716-446655440001'),
      { wrapper },
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(result.current.data).toBeNull();
    expect(mockResolve).not.toHaveBeenCalled();
  });
});
