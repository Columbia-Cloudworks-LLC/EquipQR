import { supabase } from '@/integrations/supabase/client';

export interface RecordExportArtifact {
  id: string;
  provider_file_id: string;
  web_view_link: string;
  last_exported_at: string;
  status: string;
}

export async function getLatestExportArtifact(
  organizationId: string,
  recordType: string,
  recordId: string,
  exportChannel: string,
  artifactKind: string,
): Promise<RecordExportArtifact | null> {
  const { data, error } = await supabase
    .from('record_export_artifacts')
    .select('id, provider_file_id, web_view_link, last_exported_at, status')
    .eq('organization_id', organizationId)
    .eq('record_type', recordType)
    .eq('record_id', recordId)
    .eq('export_channel', exportChannel)
    .eq('artifact_kind', artifactKind)
    .eq('status', 'current')
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}
