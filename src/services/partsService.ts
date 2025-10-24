import { supabase } from '@/integrations/supabase/client';
import type { PartCardDto, PartDetailDto } from '@/types/parts';

export async function searchParts(params: { q: string; brand?: string; category?: string; limit?: number }): Promise<{ results: PartCardDto[] }>
{
  const { data, error } = await supabase.functions.invoke('parts-search', { body: params });
  if (error) throw error;
  return data as { results: PartCardDto[] };
}

export async function getPartDetail(id: string): Promise<PartDetailDto> {
  const { data, error } = await supabase.functions.invoke('part-detail', { body: { id } });
  if (error) throw error;
  return data as PartDetailDto;
}
