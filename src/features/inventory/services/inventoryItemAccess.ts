import { supabase } from '@/integrations/supabase/client';

/**
 * Verifies an inventory item belongs to the organization before mutations or reads.
 */
export async function verifyInventoryItemInOrganization(
  organizationId: string,
  itemId: string,
): Promise<{ id: string }> {
  const { data: item, error: itemError } = await supabase
    .from('inventory_items')
    .select('id')
    .eq('id', itemId)
    .eq('organization_id', organizationId)
    .single();

  if (itemError || !item) {
    throw new Error('Inventory item not found or access denied');
  }

  return item;
}
