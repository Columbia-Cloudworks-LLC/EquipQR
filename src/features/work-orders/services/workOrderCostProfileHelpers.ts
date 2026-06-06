import { supabase } from '@/integrations/supabase/client';

/** Batch-resolve profile display names for work-order cost creators. */
export async function fetchCreatorNameMap(
  creatorIds: string[],
): Promise<Record<string, string>> {
  if (creatorIds.length === 0) {
    return {};
  }

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, name')
    .in('id', creatorIds);

  if (!profiles) {
    return {};
  }

  return profiles.reduce<Record<string, string>>((acc, profile) => {
    acc[profile.id] = profile.name;
    return acc;
  }, {});
}

export async function fetchCreatorName(userId: string): Promise<string> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('name')
    .eq('id', userId)
    .single();

  return profile?.name || 'Unknown';
}
