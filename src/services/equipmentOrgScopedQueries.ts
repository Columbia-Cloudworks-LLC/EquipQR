import { supabase } from '@/integrations/supabase/client';

const NOTES_ORG_SCOPED_SELECT = `
  *,
  equipment!inner (
    organization_id
  )
` as const;

const NOTES_ORG_SCOPED_WITH_AUTHOR_SELECT = `
  *,
  author:profiles!notes_author_id_fkey (
    id,
    name
  ),
  equipment!inner (
    organization_id
  )
` as const;

const SCANS_ORG_SCOPED_SELECT = `
  *,
  equipment!inner (
    organization_id
  )
` as const;

const SCANS_ORG_SCOPED_WITH_SCANNER_SELECT = `
  *,
  scanned_by_profile:profiles!scans_scanned_by_fkey (
    id,
    name
  ),
  equipment!inner (
    organization_id
  )
` as const;

export function queryOrgScopedEquipmentNotes(
  organizationId: string,
  equipmentId: string,
  options?: { includeAuthor?: boolean },
) {
  if (options?.includeAuthor) {
    return supabase
      .from('notes')
      .select(NOTES_ORG_SCOPED_WITH_AUTHOR_SELECT)
      .eq('equipment_id', equipmentId)
      .eq('equipment.organization_id', organizationId)
      .order('created_at', { ascending: false });
  }

  return supabase
    .from('notes')
    .select(NOTES_ORG_SCOPED_SELECT)
    .eq('equipment_id', equipmentId)
    .eq('equipment.organization_id', organizationId)
    .order('created_at', { ascending: false });
}

export function queryOrgScopedEquipmentScans(
  organizationId: string,
  equipmentId: string,
  options?: { includeScannerProfile?: boolean },
) {
  if (options?.includeScannerProfile) {
    return supabase
      .from('scans')
      .select(SCANS_ORG_SCOPED_WITH_SCANNER_SELECT)
      .eq('equipment_id', equipmentId)
      .eq('equipment.organization_id', organizationId)
      .order('scanned_at', { ascending: false });
  }

  return supabase
    .from('scans')
    .select(SCANS_ORG_SCOPED_SELECT)
    .eq('equipment_id', equipmentId)
    .eq('equipment.organization_id', organizationId)
    .order('scanned_at', { ascending: false });
}
