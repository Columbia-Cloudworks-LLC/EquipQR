import { supabase } from '@/integrations/supabase/client';

const SCANS_ORG_SCOPED_SELECT = '*, equipment!inner(organization_id)';

const SCANS_ORG_SCOPED_WITH_SCANNER_SELECT =
  '*, scanned_by_profile:profiles!scans_scanned_by_fkey(id, name), equipment!inner(organization_id)';

export function queryOrgScopedEquipmentScans(
  organizationId: string,
  equipmentId: string,
  options?: { includeScannerProfile?: boolean },
) {
  const query = options?.includeScannerProfile
    ? supabase.from('scans').select(SCANS_ORG_SCOPED_WITH_SCANNER_SELECT)
    : supabase.from('scans').select(SCANS_ORG_SCOPED_SELECT);

  return query
    .eq('equipment_id', equipmentId)
    .eq('equipment.organization_id', organizationId)
    .order('scanned_at', { ascending: false });
}
