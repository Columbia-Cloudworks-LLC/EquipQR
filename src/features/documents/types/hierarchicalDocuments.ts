import type { Tables } from '@/integrations/supabase/types';

export const FREE_TIER_DOCUMENT_LIMITS = {
  maxCanonicalDocumentsPerOrg: 25,
  maxDocumentsPerWorkOrder: 5,
  maxAclEmailsPerAction: 40,
  maxNotificationSchedulesPerDoc: 3,
  maxRecipientsPerNotification: 15,
  allowedRenewalDays: [30, 90, 180, 365] as const,
  allowedReminderOffsets: [30, 14, 7, 3, 1] as const,
} as const;

export type DocumentScopeType = 'organization' | 'team' | 'equipment' | 'work_order';

export type OrganizationDocumentType =
  | 'rental_insurance'
  | 'policy'
  | 'manual'
  | 'certificate'
  | 'work_order_attachment'
  | 'other';

export type DocumentRenewalDays = (typeof FREE_TIER_DOCUMENT_LIMITS.allowedRenewalDays)[number];

export type OrganizationDocumentRow = Tables<'organization_documents'>;
export type DocumentAttachmentRow = Tables<'document_attachments'>;
export type DocumentSignoffRow = Tables<'document_signoffs'>;
export type WorkOrderDriveFolderRow = Tables<'work_order_drive_folders'>;

export interface MaterializedDocumentAttachment extends DocumentAttachmentRow {
  canonicalDocument?: OrganizationDocumentRow | null;
}

export interface AclRecipientCandidate {
  userId: string;
  email: string;
  name: string;
  teamId?: string | null;
  teamName?: string | null;
  teamRole?: 'manager' | 'technician' | 'requestor' | 'viewer' | null;
  orgRole?: 'owner' | 'admin' | 'member' | null;
}

export interface RentalReadinessEvaluation {
  isReady: boolean;
  reason:
    | 'ready'
    | 'missing_rental_insurance'
    | 'unsigned_rental_insurance'
    | 'expired_rental_insurance';
  documentId: string | null;
  documentTitle: string | null;
  scopeType: DocumentScopeType | null;
  lastSignedAt: string | null;
  expiresAt: string | null;
}
