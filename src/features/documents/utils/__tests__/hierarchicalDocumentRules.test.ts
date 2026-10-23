import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  AclRecipientCandidate,
  MaterializedDocumentAttachment,
  OrganizationDocumentRow,
  WorkOrderDriveFolderRow,
} from '@/features/documents/types/hierarchicalDocuments';
import {
  buildWorkOrderDriveFolderName,
  canUserManageDocumentsAtScope,
  computePolicyReaderRecipients,
  computeWorkOrderWriterRecipients,
  evaluateRentalReadinessFromMaterializedAttachments,
  resolveWorkOrderFolderTerminalAction,
  validateFreeTierCanonicalCount,
  validateFreeTierWorkOrderAttachmentCount,
} from '@/features/documents/utils/hierarchicalDocumentRules';
import {
  attachGoogleDriveDocumentReference,
  getDocumentSignoffs,
  getMaterializedScopeAttachments,
  getOrganizationCanonicalDocuments,
  getWorkOrderAttachmentsForEquipment,
  signOffCanonicalDocument,
  softDeleteDocumentAttachment,
} from '@/features/documents/services/hierarchicalDocumentsService';

const mockFrom = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

vi.mock('@/utils/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

function makeCanonicalDoc(
  overrides: Partial<OrganizationDocumentRow> = {},
): OrganizationDocumentRow {
  return {
    id: 'doc-1',
    organization_id: 'org-1',
    file_id: 'drive-file-123',
    title: 'Master Certificate of Insurance 2026',
    mime_type: 'application/pdf',
    web_view_link: 'https://drive.google.com/file/d/drive-file-123/view',
    document_type: 'rental_insurance',
    is_required: true,
    renewal_days: 365,
    reminder_offsets: [30, 14, 7],
    last_signed_at: '2026-04-01T12:00:00Z',
    last_signed_by: 'user-1',
    superseded_by_document_id: null,
    superseded_at: null,
    deleted_at: null,
    created_by: 'user-1',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-04-01T12:00:00Z',
    ...overrides,
  };
}

function makeAttachment(
  overrides: Partial<MaterializedDocumentAttachment> = {},
): MaterializedDocumentAttachment {
  const canonicalDocument =
    overrides.canonicalDocument === undefined
      ? makeCanonicalDoc()
      : overrides.canonicalDocument;

  return {
    id: 'att-1',
    organization_id: 'org-1',
    document_id: canonicalDocument?.id ?? 'doc-1',
    scope_type: 'organization',
    scope_id: 'org-1',
    is_override: false,
    snapshot_file_id: canonicalDocument?.file_id ?? 'drive-file-123',
    snapshot_title: canonicalDocument?.title ?? 'Master Certificate of Insurance 2026',
    snapshot_renewal_days: canonicalDocument?.renewal_days ?? 365,
    granted_reader_emails: ['tech@example.com'],
    deleted_at: null,
    created_by: 'user-1',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    canonicalDocument,
    ...overrides,
  };
}

describe('hierarchicalDocumentRules', () => {
  describe('canUserManageDocumentsAtScope', () => {
    it('enforces the locked CRUD permission matrix across scopes', () => {
      // Org admins can manage all scopes
      expect(
        canUserManageDocumentsAtScope('organization', { isOrgAdmin: true, teamRole: null }),
      ).toBe(true);
      expect(
        canUserManageDocumentsAtScope('team', { isOrgAdmin: true, teamRole: null }),
      ).toBe(true);

      // Team manager: team, equipment, work_order -> true; organization -> false
      expect(
        canUserManageDocumentsAtScope('organization', {
          isOrgAdmin: false,
          teamRole: 'manager',
        }),
      ).toBe(false);
      expect(
        canUserManageDocumentsAtScope('team', { isOrgAdmin: false, teamRole: 'manager' }),
      ).toBe(true);
      expect(
        canUserManageDocumentsAtScope('equipment', {
          isOrgAdmin: false,
          teamRole: 'manager',
        }),
      ).toBe(true);
      expect(
        canUserManageDocumentsAtScope('work_order', {
          isOrgAdmin: false,
          teamRole: 'manager',
        }),
      ).toBe(true);

      // Technician: equipment, work_order -> true; team, organization -> false
      expect(
        canUserManageDocumentsAtScope('team', {
          isOrgAdmin: false,
          teamRole: 'technician',
        }),
      ).toBe(false);
      expect(
        canUserManageDocumentsAtScope('equipment', {
          isOrgAdmin: false,
          teamRole: 'technician',
        }),
      ).toBe(true);
      expect(
        canUserManageDocumentsAtScope('work_order', {
          isOrgAdmin: false,
          teamRole: 'technician',
        }),
      ).toBe(true);

      // Requestor: work_order -> true; equipment, team, organization -> false
      expect(
        canUserManageDocumentsAtScope('equipment', {
          isOrgAdmin: false,
          teamRole: 'requestor',
        }),
      ).toBe(false);
      expect(
        canUserManageDocumentsAtScope('work_order', {
          isOrgAdmin: false,
          teamRole: 'requestor',
        }),
      ).toBe(true);

      // Viewer: cannot upload or manage documents at any scope
      expect(
        canUserManageDocumentsAtScope('work_order', {
          isOrgAdmin: false,
          teamRole: 'viewer',
        }),
      ).toBe(false);
    });
  });

  describe('computePolicyReaderRecipients & computeWorkOrderWriterRecipients', () => {
    const candidates: AclRecipientCandidate[] = [
      {
        userId: 'u-owner',
        email: 'owner@example.com',
        name: 'Org Owner',
        orgRole: 'owner',
        teamRole: 'manager',
      },
      {
        userId: 'u-mgr',
        email: 'Manager@Example.com',
        name: 'Team Manager',
        orgRole: 'member',
        teamRole: 'manager',
      },
      {
        userId: 'u-tech',
        email: 'tech@example.com',
        name: 'Lead Tech',
        orgRole: 'member',
        teamRole: 'technician',
      },
      {
        userId: 'u-req',
        email: 'requestor@example.com',
        name: 'Customer Requestor',
        orgRole: 'member',
        teamRole: 'requestor',
      },
      {
        userId: 'u-view',
        email: 'viewer@example.com',
        name: 'Team Viewer',
        orgRole: 'member',
        teamRole: 'viewer',
      },
    ];

    it('restricts policy document Reader grants to Managers + Technicians and excludes Owners/Admins/Requestors/Viewers', () => {
      const result = computePolicyReaderRecipients(candidates);
      expect(result.exceedsCap).toBe(false);
      expect(result.recipients.map((r) => r.email)).toEqual([
        'manager@example.com',
        'tech@example.com',
      ]);
    });

    it('restricts work-order Writer grants to Technicians + Requestors + individual assignee', () => {
      const result = computeWorkOrderWriterRecipients(candidates, 'u-mgr');
      expect(result.exceedsCap).toBe(false);
      expect(result.recipients.map((r) => r.email)).toEqual([
        'manager@example.com',
        'tech@example.com',
        'requestor@example.com',
      ]);
    });
  });

  describe('Work-order Drive folder helpers & Free-tier limits', () => {
    it('formats work order folder names as WO-{shortId}-{slug} and resolves terminal actions', () => {
      const folderRowSample: Partial<WorkOrderDriveFolderRow> = {
        folder_name: buildWorkOrderDriveFolderName(
          'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
          'Hydraulic Hose & Pump Leak / Bay #2',
        ),
      };
      expect(folderRowSample.folder_name).toBe(
        'WO-A1B2C3D4-Hydraulic-Hose-Pump-Leak---Bay-2',
      );
      expect(resolveWorkOrderFolderTerminalAction(0)).toBe('delete_empty_folder');
      expect(resolveWorkOrderFolderTerminalAction(2)).toBe('demote_writers_to_readers');
    });

    it('enforces free-tier caps of 25 canonical org docs and 5 work-order attachments', () => {
      expect(validateFreeTierCanonicalCount(24).allowed).toBe(true);
      expect(validateFreeTierCanonicalCount(25).allowed).toBe(false);
      expect(validateFreeTierWorkOrderAttachmentCount(4).allowed).toBe(true);
      expect(validateFreeTierWorkOrderAttachmentCount(5).allowed).toBe(false);
    });
  });

  describe('evaluateRentalReadinessFromMaterializedAttachments', () => {
    const now = new Date('2026-06-01T00:00:00Z');

    it('returns missing_rental_insurance when no active rental insurance is attached', () => {
      const result = evaluateRentalReadinessFromMaterializedAttachments([], now);
      expect(result.isReady).toBe(false);
      expect(result.reason).toBe('missing_rental_insurance');
    });

    it('evaluates override precedence: equipment > team > organization', () => {
      const orgAttachment = makeAttachment({
        id: 'att-org',
        scope_type: 'organization',
        scope_id: 'org-1',
        canonicalDocument: makeCanonicalDoc({
          id: 'doc-org',
          title: 'Org Master Policy',
          last_signed_at: '2026-05-01T00:00:00Z',
          renewal_days: 365,
        }),
      });
      const equipOverride = makeAttachment({
        id: 'att-eq',
        scope_type: 'equipment',
        scope_id: 'eq-1',
        is_override: true,
        snapshot_title: 'Equipment Rider COI',
        canonicalDocument: makeCanonicalDoc({
          id: 'doc-eq',
          title: 'Equipment Rider COI',
          last_signed_at: null,
          renewal_days: 90,
        }),
      });

      const readiness = evaluateRentalReadinessFromMaterializedAttachments(
        [orgAttachment, equipOverride],
        now,
      );
      expect(readiness.isReady).toBe(false);
      expect(readiness.reason).toBe('unsigned_rental_insurance');
      expect(readiness.documentId).toBe('doc-eq');
      expect(readiness.scopeType).toBe('equipment');
    });

    it('detects expired rental insurance vs ready rental insurance after sign-off propagation', () => {
      const expiredAttachment = makeAttachment({
        canonicalDocument: makeCanonicalDoc({
          last_signed_at: '2025-01-01T00:00:00Z',
          renewal_days: 90,
        }),
        snapshot_renewal_days: 90,
      });

      const expiredResult = evaluateRentalReadinessFromMaterializedAttachments(
        [expiredAttachment],
        now,
      );
      expect(expiredResult.isReady).toBe(false);
      expect(expiredResult.reason).toBe('expired_rental_insurance');

      // Canonical sign-off updates last_signed_at on canonical document and propagates to all scopes
      const renewedAttachment = makeAttachment({
        canonicalDocument: makeCanonicalDoc({
          last_signed_at: '2026-05-20T00:00:00Z',
          renewal_days: 90,
        }),
        snapshot_renewal_days: 90,
      });
      const readyResult = evaluateRentalReadinessFromMaterializedAttachments(
        [renewedAttachment],
        now,
      );
      expect(readyResult.isReady).toBe(true);
      expect(readyResult.reason).toBe('ready');
    });
  });

  describe('hierarchicalDocumentsService', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('fetches canonical documents, materialized attachments, work-order docs, and signoffs', async () => {
      const canonicalDoc = makeCanonicalDoc();
      const orderMock = vi.fn().mockResolvedValue({ data: [canonicalDoc], error: null });
      const neqMock = vi.fn(() => ({ order: orderMock }));
      const isSupersededMock = vi.fn(() => ({ neq: neqMock }));
      const isDeletedMock = vi.fn(() => ({ is: isSupersededMock }));
      const eqOrgMock = vi.fn(() => ({ is: isDeletedMock }));
      mockFrom.mockReturnValueOnce({
        select: vi.fn(() => ({ eq: eqOrgMock })),
      });

      const docs = await getOrganizationCanonicalDocuments('org-1');
      expect(docs).toHaveLength(1);

      const attOrderMock = vi.fn().mockResolvedValue({
        data: [
          {
            ...makeAttachment(),
            organization_documents: canonicalDoc,
          },
        ],
        error: null,
      });
      mockFrom.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            is: vi.fn(() => ({
              in: vi.fn(() => ({ order: attOrderMock })),
            })),
          })),
        })),
      });

      const attachments = await getMaterializedScopeAttachments({
        organizationId: 'org-1',
        scopeIds: ['org-1'],
      });
      expect(attachments).toHaveLength(1);
      expect(attachments[0].canonicalDocument?.id).toBe('doc-1');

      // Work order attachments for equipment
      mockFrom
        .mockReturnValueOnce({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({ data: [{ id: 'wo-1' }], error: null }),
            })),
          })),
        })
        .mockReturnValueOnce({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              is: vi.fn(() => ({
                in: vi.fn(() => ({
                  order: vi.fn().mockResolvedValue({ data: [], error: null }),
                })),
              })),
            })),
          })),
        });

      const woDocs = await getWorkOrderAttachmentsForEquipment('org-1', 'eq-1');
      expect(woDocs).toEqual([]);

      // Signoffs
      mockFrom.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn().mockResolvedValue({ data: [], error: null }),
            })),
          })),
        })),
      });
      const signoffs = await getDocumentSignoffs('org-1', 'doc-1');
      expect(signoffs).toEqual([]);
    });

    it('attaches a Google Drive document reference, signs off canonical document, and soft deletes attachment', async () => {
      const canonicalDoc = makeCanonicalDoc();
      const rawAtt = makeAttachment();

      // 1. Count check
      mockFrom
        .mockReturnValueOnce({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              is: vi.fn(() => ({
                is: vi.fn(() => ({
                  neq: vi.fn().mockResolvedValue({ count: 3, error: null }),
                })),
              })),
            })),
          })),
        })
        // 2. Upsert organization_documents
        .mockReturnValueOnce({
          upsert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({ data: canonicalDoc, error: null }),
            })),
          })),
        })
        // 3. Insert document_attachments
        .mockReturnValueOnce({
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({ data: rawAtt, error: null }),
            })),
          })),
        });

      const attached = await attachGoogleDriveDocumentReference({
        organizationId: 'org-1',
        userId: 'user-1',
        scopeType: 'organization',
        scopeId: 'org-1',
        fileId: 'drive-file-123',
        title: 'Master Certificate of Insurance 2026',
        documentType: 'rental_insurance',
        isRequired: true,
        renewalDays: 365,
        reminderOffsets: [30, 14, 7],
        confirmedReaderEmails: ['Tech@Example.com'],
      });
      expect(attached.canonicalDocument?.id).toBe('doc-1');

      // Sign off canonical document
      mockFrom
        .mockReturnValueOnce({
          update: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                select: vi.fn(() => ({
                  single: vi.fn().mockResolvedValue({ data: canonicalDoc, error: null }),
                })),
              })),
            })),
          })),
        })
        .mockReturnValueOnce({
          insert: vi.fn().mockResolvedValue({ error: null }),
        });

      const signedDoc = await signOffCanonicalDocument({
        organizationId: 'org-1',
        documentId: 'doc-1',
        userId: 'user-1',
        action: 'affirm',
        previousFileId: 'drive-file-123',
        notes: 'Reviewed with broker',
      });
      expect(signedDoc.id).toBe('doc-1');

      // Soft delete attachment
      mockFrom.mockReturnValueOnce({
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({ error: null }),
          })),
        })),
      });

      await expect(
        softDeleteDocumentAttachment('org-1', 'att-1'),
      ).resolves.toBeUndefined();
    });
  });
});
