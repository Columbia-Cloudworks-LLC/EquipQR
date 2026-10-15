import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';

/**
 * Owner-granted, time-limited EquipQR Support access (issue #1648 review).
 * Grants go through the support-access Edge Function (it needs the operator
 * allowlist and emails the operators); revoking is a direct owner-only RPC.
 */

export type SupportAccessHours = 24 | 72 | 168;

export const SUPPORT_ACCESS_DURATIONS: ReadonlyArray<{ hours: SupportAccessHours; label: string }> = [
  { hours: 24, label: '24 hours' },
  { hours: 72, label: '72 hours' },
  { hours: 168, label: '7 days' },
];

export const DEFAULT_SUPPORT_ACCESS_HOURS: SupportAccessHours = 72;

const supportAccessKey = (organizationId: string | undefined) => ['support-access', organizationId] as const;

export function useSupportAccessStatus(organizationId: string | undefined) {
  return useQuery({
    queryKey: supportAccessKey(organizationId),
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_support_access_status', {
        p_organization_id: organizationId ?? '',
      });
      if (error) throw error;
      return data?.[0] ?? null;
    },
    enabled: Boolean(organizationId),
    staleTime: 60 * 1000,
    // Re-check so the banner disappears soon after expiry.
    refetchInterval: 5 * 60 * 1000,
  });
}

const grantResponseSchema = z.object({ expiresAt: z.string(), extended: z.boolean(), operatorsNotified: z.boolean() });
const errorPayloadSchema = z.object({ error: z.string(), message: z.string().optional() });

export async function grantSupportAccess(input: {
  organizationId: string;
  durationHours: SupportAccessHours;
  source: 'settings' | 'bug_report';
  ticketRef?: string;
}) {
  const { data, error } = await supabase.functions.invoke('support-access', { body: input });
  if (error) {
    const body: unknown =
      error.context instanceof Response ? await error.context.clone().json().catch(() => null) : null;
    const payload = errorPayloadSchema.safeParse(body);
    throw new Error(payload.success ? (payload.data.message ?? payload.data.error) : 'Could not grant support access');
  }
  const parsed = grantResponseSchema.safeParse(data);
  if (!parsed.success) throw new Error('Could not grant support access');
  return parsed.data;
}

export function useGrantSupportAccess(organizationId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (durationHours: SupportAccessHours) =>
      grantSupportAccess({ organizationId: organizationId ?? '', durationHours, source: 'settings' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: supportAccessKey(organizationId) }),
  });
}

export function useRevokeSupportAccess(organizationId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('revoke_support_access', { p_organization_id: organizationId ?? '' });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: supportAccessKey(organizationId) }),
  });
}
