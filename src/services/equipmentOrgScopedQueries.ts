import { supabase } from '@/integrations/supabase/client';

const NOTES_ORG_SCOPED_SELECT = `
  *,
  equipment!inner (
    organization_id
  )
`;

const NOTES_ORG_SCOPED_WITH_AUTHOR_SELECT = `
  *,
  author:profiles!notes_author_id_fkey (
    id,
    name
  ),
  equipment!inner (
    organization_id
  )
`;

const SCANS_ORG_SCOPED_SELECT = `
  *,
  equipment!inner (
    organization_id
  )
`;

const SCANS_ORG_SCOPED_WITH_SCANNER_SELECT = `
  *,
  scanned_by_profile:profiles!scans_scanned_by_fkey (
    id,
    name
  ),
  equipment!inner (
    organization_id
  )
`;

export function queryOrgScopedEquipmentNotes(
  organizationId: string,
  equipmentId: string,
  options?: { includeAuthor?: boolean },
) {
  const select = options?.includeAuthor
    ? NOTES_ORG_SCOPED_WITH_AUTHOR_SELECT
    : NOTES_ORG_SCOPED_SELECT;

  return supabase
    .from('notes')
    .select(select)
    .eq('equipment_id', equipmentId)
    .eq('equipment.organization_id', organizationId)
    .order('created_at', { ascending: false });
}

export function queryOrgScopedEquipmentScans(
  organizationId: string,
  equipmentId: string,
  options?: { includeScannerProfile?: boolean },
) {
  const select = options?.includeScannerProfile
    ? SCANS_ORG_SCOPED_WITH_SCANNER_SELECT
    : SCANS_ORG_SCOPED_SELECT;

  return supabase
    .from('scans')
    .select(select)
    .eq('equipment_id', equipmentId)
    .eq('equipment.organization_id', organizationId)
    .order('scanned_at', { ascending: false });
}
