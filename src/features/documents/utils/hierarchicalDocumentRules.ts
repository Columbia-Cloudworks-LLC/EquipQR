import {
  FREE_TIER_DOCUMENT_LIMITS,
  type AclRecipientCandidate,
  type DocumentScopeType,
  type MaterializedDocumentAttachment,
  type RentalReadinessEvaluation,
} from '@/features/documents/types/hierarchicalDocuments';

export interface DocumentPermissionContext {
  isOrgAdmin: boolean;
  teamRole?: 'manager' | 'technician' | 'requestor' | 'viewer' | null;
}

/**
 * Enforces the locked CRUD permission matrix for Hierarchical Documents (#1422):
 * - Organization Documents: organization administrators only
 * - Team Documents: organization administrators or team managers
 * - Equipment Documents: organization administrators, team managers, or technicians
 * - Work Order Documents: organization administrators, team managers, technicians, or requestors
 * - Viewers cannot upload or manage documents at any scope
 */
export function canUserManageDocumentsAtScope(
  scopeType: DocumentScopeType,
  ctx: DocumentPermissionContext,
): boolean {
  if (ctx.isOrgAdmin) return true;
  if (!ctx.teamRole || ctx.teamRole === 'viewer') return false;

  switch (scopeType) {
    case 'organization':
      return false;
    case 'team':
      return ctx.teamRole === 'manager';
    case 'equipment':
      return ctx.teamRole === 'manager' || ctx.teamRole === 'technician';
    case 'work_order':
      return (
        ctx.teamRole === 'manager' ||
        ctx.teamRole === 'technician' ||
        ctx.teamRole === 'requestor'
      );
  }
}

function filterUniqueNonAdminRecipients(
  candidates: AclRecipientCandidate[],
  predicate: (candidate: AclRecipientCandidate) => boolean,
): { recipients: AclRecipientCandidate[]; exceedsCap: boolean } {
  const seenEmails = new Set<string>();
  const filtered: AclRecipientCandidate[] = [];

  for (const candidate of candidates) {
    const email = candidate.email.trim().toLowerCase();
    if (!email || seenEmails.has(email)) continue;

    // Never explicitly grant to org Admins/Owners (they act through the connected Workspace token)
    if (candidate.orgRole === 'owner' || candidate.orgRole === 'admin') {
      continue;
    }

    if (!predicate(candidate)) {
      continue;
    }

    seenEmails.add(email);
    filtered.push({ ...candidate, email });
  }

  return {
    recipients: filtered.slice(0, FREE_TIER_DOCUMENT_LIMITS.maxAclEmailsPerAction),
    exceedsCap: filtered.length > FREE_TIER_DOCUMENT_LIMITS.maxAclEmailsPerAction,
  };
}

/**
 * Policy-document Reader grants go to team Managers + Technicians only.
 * Excludes Requestors, Viewers, pure org Members not on a team, and org Owners/Admins
 * (who act through the connected Workspace token).
 */
export function computePolicyReaderRecipients(
  candidates: AclRecipientCandidate[],
): { recipients: AclRecipientCandidate[]; exceedsCap: boolean } {
  return filterUniqueNonAdminRecipients(
    candidates,
    (candidate) =>
      candidate.teamRole === 'manager' || candidate.teamRole === 'technician',
  );
}

/**
 * Work-order folder Writer grants go to current Technicians + Requestors on the
 * managing team plus the individual assignee if present (excluding org Admins/Owners).
 */
export function computeWorkOrderWriterRecipients(
  candidates: AclRecipientCandidate[],
  assigneeUserId?: string | null,
): { recipients: AclRecipientCandidate[]; exceedsCap: boolean } {
  return filterUniqueNonAdminRecipients(candidates, (candidate) => {
    const isEligibleTeamRole =
      candidate.teamRole === 'technician' || candidate.teamRole === 'requestor';
    const isIndividualAssignee =
      Boolean(assigneeUserId) && candidate.userId === assigneeUserId;
    return isEligibleTeamRole || isIndividualAssignee;
  });
}

/**
 * Formats a work-order Drive folder name as `WO-{shortId}-{slug}` on the
 * Submitted -> Accepted transition.
 */
export function buildWorkOrderDriveFolderName(
  workOrderId: string,
  title: string,
): string {
  const shortId = workOrderId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8).toUpperCase() || 'WO';
  const slug =
    title
      .trim()
      .replace(/[/\\]+/g, '-')
      .replace(/[^a-zA-Z0-9\s-_]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .slice(0, 48) || 'Work-Order';

  return `WO-${shortId}-${slug}`;
}

export function resolveWorkOrderFolderTerminalAction(
  nonTrashedChildCount: number,
): 'delete_empty_folder' | 'demote_writers_to_readers' {
  return nonTrashedChildCount <= 0
    ? 'delete_empty_folder'
    : 'demote_writers_to_readers';
}

export function validateFreeTierCanonicalCount(activeCanonicalCount: number): {
  allowed: boolean;
  error?: string;
} {
  if (activeCanonicalCount >= FREE_TIER_DOCUMENT_LIMITS.maxCanonicalDocumentsPerOrg) {
    return {
      allowed: false,
      error: `Free tier limit of ${FREE_TIER_DOCUMENT_LIMITS.maxCanonicalDocumentsPerOrg} documents reached. Remove or archive an unused document to attach another.`,
    };
  }
  return { allowed: true };
}

export function validateFreeTierWorkOrderAttachmentCount(activeWoDocCount: number): {
  allowed: boolean;
  error?: string;
} {
  if (activeWoDocCount >= FREE_TIER_DOCUMENT_LIMITS.maxDocumentsPerWorkOrder) {
    return {
      allowed: false,
      error: `Free tier limit of ${FREE_TIER_DOCUMENT_LIMITS.maxDocumentsPerWorkOrder} documents per work order reached.`,
    };
  }
  return { allowed: true };
}

export function evaluateRentalReadinessFromMaterializedAttachments(
  attachments: MaterializedDocumentAttachment[],
  now: Date = new Date(),
): RentalReadinessEvaluation {
  const scopeRank: Record<DocumentScopeType, number> = {
    equipment: 1,
    team: 2,
    organization: 3,
    work_order: 4,
  };

  const activeRentalAttachments = attachments
    .filter((att) => {
      const doc = att.canonicalDocument;
      if (att.deleted_at || !doc || doc.deleted_at || doc.superseded_at) return false;
      if (att.scope_type === 'work_order') return false;
      return doc.document_type === 'rental_insurance';
    })
    .sort((a, b) => {
      const rankA = scopeRank[a.scope_type as DocumentScopeType] ?? 4;
      const rankB = scopeRank[b.scope_type as DocumentScopeType] ?? 4;
      if (rankA !== rankB) return rankA - rankB;
      if (a.is_override !== b.is_override) return a.is_override ? -1 : 1;
      return b.created_at.localeCompare(a.created_at);
    });

  const winner = activeRentalAttachments[0];
  if (!winner || !winner.canonicalDocument) {
    return {
      isReady: false,
      reason: 'missing_rental_insurance',
      documentId: null,
      documentTitle: null,
      scopeType: null,
      lastSignedAt: null,
      expiresAt: null,
    };
  }

  const doc = winner.canonicalDocument;
  const scopeType = winner.scope_type as DocumentScopeType;
  if (!doc.last_signed_at) {
    return {
      isReady: false,
      reason: 'unsigned_rental_insurance',
      documentId: doc.id,
      documentTitle: winner.snapshot_title || doc.title,
      scopeType,
      lastSignedAt: null,
      expiresAt: null,
    };
  }

  const renewalDays = winner.snapshot_renewal_days ?? doc.renewal_days ?? 365;
  const signedAtMs = new Date(doc.last_signed_at).getTime();
  const expiresAtDate = new Date(signedAtMs + renewalDays * 24 * 60 * 60 * 1000);

  if (expiresAtDate.getTime() < now.getTime()) {
    return {
      isReady: false,
      reason: 'expired_rental_insurance',
      documentId: doc.id,
      documentTitle: winner.snapshot_title || doc.title,
      scopeType,
      lastSignedAt: doc.last_signed_at,
      expiresAt: expiresAtDate.toISOString(),
    };
  }

  return {
    isReady: true,
    reason: 'ready',
    documentId: doc.id,
    documentTitle: winner.snapshot_title || doc.title,
    scopeType,
    lastSignedAt: doc.last_signed_at,
    expiresAt: expiresAtDate.toISOString(),
  };
}
