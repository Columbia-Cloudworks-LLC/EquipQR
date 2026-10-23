import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';
import {
  FREE_TIER_DOCUMENT_LIMITS,
  type DocumentAttachmentRow,
  type DocumentRenewalDays,
  type DocumentScopeType,
  type DocumentSignoffRow,
  type MaterializedDocumentAttachment,
  type OrganizationDocumentRow,
  type OrganizationDocumentType,
} from '@/features/documents/types/hierarchicalDocuments';
import {
  validateFreeTierCanonicalCount,
  validateFreeTierWorkOrderAttachmentCount,
} from '@/features/documents/utils/hierarchicalDocumentRules';

type AttachmentRowWithJoinedDoc = DocumentAttachmentRow & {
  organization_documents?: OrganizationDocumentRow | OrganizationDocumentRow[] | null;
};

function mapAttachmentWithDoc(row: AttachmentRowWithJoinedDoc): MaterializedDocumentAttachment {
  const joinedDoc = Array.isArray(row.organization_documents)
    ? row.organization_documents[0] ?? null
    : row.organization_documents ?? null;

  return {
    id: row.id,
    organization_id: row.organization_id,
    document_id: row.document_id,
    scope_type: row.scope_type,
    scope_id: row.scope_id,
    is_override: row.is_override,
    snapshot_file_id: row.snapshot_file_id,
    snapshot_title: row.snapshot_title,
    snapshot_renewal_days: row.snapshot_renewal_days,
    granted_reader_emails: row.granted_reader_emails,
    deleted_at: row.deleted_at,
    created_by: row.created_by,
    created_at: row.created_at,
    updated_at: row.updated_at,
    canonicalDocument: joinedDoc,
  };
}

export async function getOrganizationCanonicalDocuments(
  organizationId: string,
): Promise<OrganizationDocumentRow[]> {
  try {
    const { data, error } = await supabase
      .from('organization_documents')
      .select('*')
      .eq('organization_id', organizationId)
      .is('deleted_at', null)
      .is('superseded_at', null)
      .neq('document_type', 'work_order_attachment')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data ?? [];
  } catch (error) {
    logger.error('Error fetching organization canonical documents:', error);
    throw error;
  }
}

export async function getMaterializedScopeAttachments(params: {
  organizationId: string;
  scopeIds: string[];
}): Promise<MaterializedDocumentAttachment[]> {
  if (params.scopeIds.length === 0) return [];

  try {
    const { data, error } = await supabase
      .from('document_attachments')
      .select(
        `
        *,
        organization_documents(*)
      `,
      )
      .eq('organization_id', params.organizationId)
      .is('deleted_at', null)
      .in('scope_id', params.scopeIds)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data ?? []).map((row) => mapAttachmentWithDoc(row));
  } catch (error) {
    logger.error('Error fetching materialized document attachments:', error);
    throw error;
  }
}

export async function getWorkOrderAttachmentsForEquipment(
  organizationId: string,
  equipmentId: string,
): Promise<MaterializedDocumentAttachment[]> {
  try {
    const { data: workOrders, error: woError } = await supabase
      .from('work_orders')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('equipment_id', equipmentId);

    if (woError) throw woError;
    const workOrderIds = (workOrders ?? []).map((wo) => wo.id);
    if (workOrderIds.length === 0) return [];

    const allScopeAttachments = await getMaterializedScopeAttachments({
      organizationId,
      scopeIds: workOrderIds,
    });
    return allScopeAttachments.filter((att) => att.scope_type === 'work_order');
  } catch (error) {
    logger.error('Error fetching work order documents for equipment:', error);
    return [];
  }
}

export interface AttachDriveDocumentInput {
  organizationId: string;
  userId: string;
  scopeType: DocumentScopeType;
  scopeId: string;
  fileId: string;
  title: string;
  mimeType?: string | null;
  webViewLink?: string | null;
  documentType: OrganizationDocumentType;
  isRequired?: boolean;
  renewalDays?: DocumentRenewalDays | null;
  reminderOffsets?: number[];
  isOverride?: boolean;
  confirmedReaderEmails: string[];
}

export async function attachGoogleDriveDocumentReference(
  input: AttachDriveDocumentInput,
): Promise<MaterializedDocumentAttachment> {
  const cleanedEmails = input.confirmedReaderEmails
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, FREE_TIER_DOCUMENT_LIMITS.maxAclEmailsPerAction);

  if (input.scopeType === 'work_order') {
    const { count, error: countErr } = await supabase
      .from('document_attachments')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', input.organizationId)
      .eq('scope_type', 'work_order')
      .eq('scope_id', input.scopeId)
      .is('deleted_at', null);

    if (countErr) throw countErr;
    const check = validateFreeTierWorkOrderAttachmentCount(count ?? 0);
    if (!check.allowed) {
      throw new Error(check.error);
    }
  } else {
    const { count, error: countErr } = await supabase
      .from('organization_documents')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', input.organizationId)
      .is('deleted_at', null)
      .is('superseded_at', null)
      .neq('document_type', 'work_order_attachment');

    if (countErr) throw countErr;
    const check = validateFreeTierCanonicalCount(count ?? 0);
    if (!check.allowed) {
      throw new Error(check.error);
    }
  }

  const nowIso = new Date().toISOString();

  // Upsert canonical document by (organization_id, file_id)
  const { data: canonicalDoc, error: docError } = await supabase
    .from('organization_documents')
    .upsert(
      {
        organization_id: input.organizationId,
        file_id: input.fileId.trim(),
        title: input.title.trim(),
        mime_type: input.mimeType ?? null,
        web_view_link: input.webViewLink?.trim() || null,
        document_type:
          input.scopeType === 'work_order' ? 'work_order_attachment' : input.documentType,
        is_required:
          input.documentType === 'rental_insurance' ? Boolean(input.isRequired) : false,
        renewal_days: input.renewalDays ?? null,
        reminder_offsets: (input.reminderOffsets ?? []).slice(
          0,
          FREE_TIER_DOCUMENT_LIMITS.maxNotificationSchedulesPerDoc,
        ),
        deleted_at: null,
        superseded_at: null,
        created_by: input.userId,
        updated_at: nowIso,
      },
      { onConflict: 'organization_id,file_id' },
    )
    .select('*')
    .single();

  if (docError) throw docError;

  const { data: attachment, error: attachError } = await supabase
    .from('document_attachments')
    .insert({
      organization_id: input.organizationId,
      document_id: canonicalDoc.id,
      scope_type: input.scopeType,
      scope_id: input.scopeId,
      is_override: Boolean(input.isOverride),
      snapshot_file_id: canonicalDoc.file_id,
      snapshot_title: canonicalDoc.title,
      snapshot_renewal_days: canonicalDoc.renewal_days,
      granted_reader_emails: cleanedEmails,
      created_by: input.userId,
    })
    .select('*')
    .single();

  if (attachError) throw attachError;

  return {
    ...attachment,
    canonicalDocument: canonicalDoc,
  };
}

export async function softDeleteDocumentAttachment(
  organizationId: string,
  attachmentId: string,
): Promise<void> {
  const nowIso = new Date().toISOString();
  const { error } = await supabase
    .from('document_attachments')
    .update({
      deleted_at: nowIso,
      updated_at: nowIso,
    })
    .eq('id', attachmentId)
    .eq('organization_id', organizationId);

  if (error) throw error;
}

export async function signOffCanonicalDocument(params: {
  organizationId: string;
  documentId: string;
  userId: string;
  action: 'affirm' | 'replace';
  previousFileId: string;
  newFileId?: string;
  newTitle?: string;
  newWebViewLink?: string | null;
  notes?: string | null;
}): Promise<OrganizationDocumentRow> {
  const nowIso = new Date().toISOString();
  const effectiveNewFileId =
    params.action === 'replace' && params.newFileId?.trim()
      ? params.newFileId.trim()
      : params.previousFileId;

  const updatePayload: Record<string, unknown> = {
    last_signed_at: nowIso,
    last_signed_by: params.userId,
    updated_at: nowIso,
  };

  if (params.action === 'replace' && params.newFileId?.trim()) {
    updatePayload.file_id = params.newFileId.trim();
    if (params.newTitle?.trim()) {
      updatePayload.title = params.newTitle.trim();
    }
    if (params.newWebViewLink !== undefined) {
      updatePayload.web_view_link = params.newWebViewLink?.trim() || null;
    }
  }

  const { data: updatedDoc, error: updateError } = await supabase
    .from('organization_documents')
    .update(updatePayload)
    .eq('id', params.documentId)
    .eq('organization_id', params.organizationId)
    .select('*')
    .single();

  if (updateError) throw updateError;

  const { error: signoffError } = await supabase.from('document_signoffs').insert({
    organization_id: params.organizationId,
    document_id: params.documentId,
    action: params.action,
    previous_file_id: params.previousFileId,
    new_file_id: effectiveNewFileId,
    notes: params.notes?.trim() || null,
    signed_by: params.userId,
    signed_at: nowIso,
  });

  if (signoffError) throw signoffError;
  return updatedDoc;
}

export async function getDocumentSignoffs(
  organizationId: string,
  documentId: string,
): Promise<DocumentSignoffRow[]> {
  const { data, error } = await supabase
    .from('document_signoffs')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('document_id', documentId)
    .order('signed_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}
