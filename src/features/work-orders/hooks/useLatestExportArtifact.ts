import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { exportArtifacts } from '@/lib/queryKeys';

export interface ExportArtifact {
  id: string;
  provider_file_id: string;
  web_view_link: string;
  last_exported_at: string;
  export_channel: string;
  artifact_kind: string;
}

async function fetchLatestArtifact(
  organizationId: string,
  recordType: string,
  recordId: string,
): Promise<ExportArtifact | null> {
  const { data, error } = await supabase
    .from('record_export_artifacts')
    .select('id, provider_file_id, web_view_link, last_exported_at, export_channel, artifact_kind')
    .eq('organization_id', organizationId)
    .eq('record_type', recordType)
    .eq('record_id', recordId)
    .eq('status', 'current')
    .order('last_exported_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as ExportArtifact) ?? null;
}

export function useLatestExportArtifact(
  organizationId: string | undefined,
  recordType: string,
  recordId: string | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: exportArtifacts.latest(
      organizationId ?? '',
      recordType,
      recordId ?? '',
    ),
    queryFn: () => fetchLatestArtifact(organizationId!, recordType, recordId!),
    enabled: Boolean(organizationId) && Boolean(recordId) && enabled,
    staleTime: 60 * 1000,
  });
}
