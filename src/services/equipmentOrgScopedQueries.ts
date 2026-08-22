import { supabase } from '@/integrations/supabase/client';

const NOTES_ORG_SCOPED_SELECT = '*, equipment!inner(organization_id)';

const NOTES_ORG_SCOPED_WITH_AUTHOR_SELECT =
  '*, author:profiles!notes_author_id_fkey(id, name), equipment!inner(organization_id)';

const SCANS_ORG_SCOPED_SELECT = '*, equipment!inner(organization_id)';

const SCANS_ORG_SCOPED_WITH_SCANNER_SELECT =
  '*, scanned_by_profile:profiles!scans_scanned_by_fkey(id, name), equipment!inner(organization_id)';

export function queryOrgScopedEquipmentNotes(
  organizationId: string,
  equipmentId: string,
  options?: { includeAuthor?: boolean },
) {
  // One literal per `.select()` — a union of select strings types `data` as ParserError.
  const query = options?.includeAuthor
    ? supabase.from('notes').select(NOTES_ORG_SCOPED_WITH_AUTHOR_SELECT)
    : supabase.from('notes').select(NOTES_ORG_SCOPED_SELECT);

  return query
    .eq('equipment_id', equipmentId)
    .eq('equipment.organization_id', organizationId)
    .order('created_at', { ascending: false });
}

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
