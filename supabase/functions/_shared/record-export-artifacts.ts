import type { SupabaseClient } from "npm:@supabase/supabase-js@2.45.0";
import { deleteGoogleDriveFile } from "./google-docs-api.ts";

export const WORK_ORDER_RECORD_TYPE = "work_order";

export interface TrackGoogleDriveExportArtifactParams {
  organizationId: string;
  recordId: string;
  exportChannel: string;
  artifactKind: string;
  providerFileId: string;
  webViewLink: string;
  providerParentId?: string | null;
  userId: string;
  accessToken: string;
}

export interface TrackGoogleDriveExportArtifactResult {
  replacedPrevious: boolean;
  warnings: string[];
}

export async function trackGoogleDriveExportArtifact(
  adminClient: SupabaseClient,
  params: TrackGoogleDriveExportArtifactParams,
): Promise<TrackGoogleDriveExportArtifactResult> {
  const warnings: string[] = [];
  let replacedPrevious = false;

  const { data: prevArtifact, error: prevArtifactError } = await adminClient
    .from("record_export_artifacts")
    .select("id, provider_file_id")
    .eq("organization_id", params.organizationId)
    .eq("record_type", WORK_ORDER_RECORD_TYPE)
    .eq("record_id", params.recordId)
    .eq("export_channel", params.exportChannel)
    .eq("artifact_kind", params.artifactKind)
    .eq("status", "current")
    .maybeSingle();

  if (prevArtifactError) {
    console.error("[RECORD-EXPORT-ARTIFACTS] Previous artifact lookup failed:", prevArtifactError.message);
    warnings.push(
      "Could not check for a previous export; a new file will be created without replacing the old one.",
    );
  }

  const { error: artifactUpsertError } = await adminClient
    .from("record_export_artifacts")
    .upsert({
      organization_id: params.organizationId,
      record_type: WORK_ORDER_RECORD_TYPE,
      record_id: params.recordId,
      export_channel: params.exportChannel,
      artifact_kind: params.artifactKind,
      provider: "google_drive",
      provider_file_id: params.providerFileId,
      web_view_link: params.webViewLink,
      provider_parent_id: params.providerParentId ?? null,
      last_exported_at: new Date().toISOString(),
      last_exported_by: params.userId,
      status: "current",
    }, {
      onConflict: "organization_id,record_type,record_id,export_channel,artifact_kind",
    });

  if (artifactUpsertError) {
    console.error("[RECORD-EXPORT-ARTIFACTS] Artifact upsert failed:", artifactUpsertError.message);
    warnings.push(
      "Export succeeded but lineage tracking could not be saved. The Open shortcut may not reflect this export.",
    );
  }

  if (
    prevArtifact?.provider_file_id
    && prevArtifact.provider_file_id !== params.providerFileId
  ) {
    const deleteResult = await deleteGoogleDriveFile(
      params.accessToken,
      prevArtifact.provider_file_id,
    );

    if (deleteResult.outcome === "deleted") {
      replacedPrevious = true;
    } else if (deleteResult.outcome === "not_found") {
      replacedPrevious = true;
    } else {
      warnings.push("Previous export could not be deleted; a new file was created alongside it.");
    }
  }

  return { replacedPrevious, warnings };
}
