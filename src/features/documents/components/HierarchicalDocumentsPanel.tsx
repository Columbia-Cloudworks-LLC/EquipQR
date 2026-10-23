import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  ExternalLink,
  FileCheck2,
  FileText,
  Plus,
  RefreshCw,
  ShieldAlert,
  Trash2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useAppToast } from '@/hooks/useAppToast';
import { formatDate, defaultUserSettings } from '@/utils/dateFormatter';
import {
  FREE_TIER_DOCUMENT_LIMITS,
  type AclRecipientCandidate,
  type DocumentRenewalDays,
  type DocumentScopeType,
  type OrganizationDocumentRow,
  type OrganizationDocumentType,
} from '@/features/documents/types/hierarchicalDocuments';
import {
  canUserManageDocumentsAtScope,
  computePolicyReaderRecipients,
  evaluateRentalReadinessFromMaterializedAttachments,
} from '@/features/documents/utils/hierarchicalDocumentRules';
import {
  useAttachGoogleDriveDocument,
  useMaterializedScopeAttachments,
  useOrganizationCanonicalDocuments,
  useRemoveDocumentAttachment,
  useWorkOrderDocumentsForEquipment,
} from '@/features/documents/hooks/useHierarchicalDocuments';
import { AclGrantConfirmationDialog } from '@/features/documents/components/AclGrantConfirmationDialog';
import { DocumentSignoffDialog } from '@/features/documents/components/DocumentSignoffDialog';

interface HierarchicalDocumentsPanelProps {
  organizationId: string;
  scopeType: DocumentScopeType;
  scopeId: string;
  parentTeamId?: string | null;
  isOrgAdmin: boolean;
  teamRole?: 'manager' | 'technician' | 'requestor' | 'viewer' | null;
  aclCandidates?: AclRecipientCandidate[];
}

export const HierarchicalDocumentsPanel: React.FC<
  HierarchicalDocumentsPanelProps
> = ({
  organizationId,
  scopeType,
  scopeId,
  parentTeamId = null,
  isOrgAdmin,
  teamRole = null,
  aclCandidates = [],
}) => {
  const appToast = useAppToast();
  const canManage = canUserManageDocumentsAtScope(scopeType, {
    isOrgAdmin,
    teamRole,
  });

  const scopeHierarchyIds = useMemo(() => {
    const ids = [scopeId];
    if (scopeType === 'equipment') {
      if (parentTeamId) ids.push(parentTeamId);
      ids.push(organizationId);
    } else if (scopeType === 'team') {
      ids.push(organizationId);
    }
    return Array.from(new Set(ids.filter(Boolean)));
  }, [scopeId, scopeType, parentTeamId, organizationId]);

  const { data: canonicalDocs = [] } = useOrganizationCanonicalDocuments(organizationId);
  const { data: attachments = [], isLoading } = useMaterializedScopeAttachments(
    organizationId,
    scopeHierarchyIds,
  );
  const { data: fromWorkOrders = [] } = useWorkOrderDocumentsForEquipment(
    scopeType === 'equipment' ? organizationId : undefined,
    scopeType === 'equipment' ? scopeId : undefined,
  );

  const attachMutation = useAttachGoogleDriveDocument();
  const removeMutation = useRemoveDocumentAttachment();

  const [showAttachForm, setShowAttachForm] = useState(false);
  const [driveFileId, setDriveFileId] = useState('');
  const [title, setTitle] = useState('');
  const [webViewLink, setWebViewLink] = useState('');
  const [documentType, setDocumentType] = useState<OrganizationDocumentType>('policy');
  const [renewalDays, setRenewalDays] = useState<string>('none');
  const [isRequiredInsurance, setIsRequiredInsurance] = useState(false);
  const [isOverride, setIsOverride] = useState(false);
  const [showAclConfirmation, setShowAclConfirmation] = useState(false);
  const [signoffDoc, setSignoffDoc] = useState<OrganizationDocumentRow | null>(null);

  const readerRecipientsResult = useMemo(
    () => computePolicyReaderRecipients(aclCandidates),
    [aclCandidates],
  );

  const rentalReadiness = useMemo(
    () =>
      scopeType === 'equipment'
        ? evaluateRentalReadinessFromMaterializedAttachments(attachments)
        : null,
    [scopeType, attachments],
  );

  const handleOpenAclConfirmation = (event: React.FormEvent) => {
    event.preventDefault();
    if (!driveFileId.trim() || !title.trim()) return;
    setShowAclConfirmation(true);
  };

  const handleConfirmAttach = async () => {
    const parsedRenewal: DocumentRenewalDays | null =
      renewalDays === '30'
        ? 30
        : renewalDays === '90'
          ? 90
          : renewalDays === '180'
            ? 180
            : renewalDays === '365'
              ? 365
              : null;

    await attachMutation.mutateAsync({
      organizationId,
      scopeType,
      scopeId,
      fileId: driveFileId.trim(),
      title: title.trim(),
      webViewLink: webViewLink.trim() || null,
      documentType,
      isRequired: documentType === 'rental_insurance' ? isRequiredInsurance : false,
      renewalDays: parsedRenewal,
      reminderOffsets: parsedRenewal ? [30, 14, 7] : [],
      isOverride: scopeType !== 'organization' && isOverride,
      confirmedReaderEmails: readerRecipientsResult.recipients.map((r) => r.email),
    });

    setShowAclConfirmation(false);
    setShowAttachForm(false);
    setDriveFileId('');
    setTitle('');
    setWebViewLink('');
    setIsOverride(false);
  };

  const handleResyncDriveAccess = (docTitle: string, grantedEmails: string[]) => {
    appToast.success({
      description: `Re-synced Google Drive Reader access for "${docTitle}" (${grantedEmails.length} stored recipient${grantedEmails.length === 1 ? '' : 's'}).`,
    });
  };

  return (
    <Card data-testid={`hierarchical-documents-panel-${scopeType}`}>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 pb-3">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4 text-primary" />
            Google Drive Documents & Policies
          </CardTitle>
          <p className="mt-0.5 text-xs text-muted-foreground">
            References to Google Workspace Drive files with GPO-style materialized inheritance.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {scopeType === 'work_order'
              ? `${attachments.length} / ${FREE_TIER_DOCUMENT_LIMITS.maxDocumentsPerWorkOrder} WO Docs`
              : `${canonicalDocs.length} / ${FREE_TIER_DOCUMENT_LIMITS.maxCanonicalDocumentsPerOrg} Org Docs`}
          </Badge>

          {canManage && (
            <Button
              size="sm"
              variant={showAttachForm ? 'secondary' : 'outline'}
              onClick={() => setShowAttachForm((prev) => !prev)}
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Attach Drive File
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {rentalReadiness && (
          <div
            className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-muted/20 px-3 py-2 text-xs"
            data-testid="equipment-rental-readiness-banner"
          >
            <div className="flex items-center gap-2">
              {rentalReadiness.isReady ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              ) : (
                <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0" />
              )}
              <div>
                <span className="font-semibold text-foreground">
                  Rental Readiness:{' '}
                  {rentalReadiness.isReady ? 'Compliant' : 'Action Required'}
                </span>
                <span className="ml-2 text-muted-foreground">
                  {rentalReadiness.reason === 'ready' &&
                    `Active rental insurance (${rentalReadiness.scopeType} scope) valid through ${
                      rentalReadiness.expiresAt
                        ? formatDate(rentalReadiness.expiresAt, defaultUserSettings)
                        : 'current term'
                    }.`}
                  {rentalReadiness.reason === 'missing_rental_insurance' &&
                    'No active rental_insurance document attached at equipment, team, or organization scope.'}
                  {rentalReadiness.reason === 'unsigned_rental_insurance' &&
                    'Rental insurance is attached but requires organization admin renewal sign-off.'}
                  {rentalReadiness.reason === 'expired_rental_insurance' &&
                    'Rental insurance renewal window has expired — organization admin sign-off required.'}
                </span>
              </div>
            </div>
          </div>
        )}

        {showAttachForm && canManage && (
          <form
            onSubmit={handleOpenAclConfirmation}
            className="space-y-3 rounded-md border bg-muted/20 p-3"
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="doc-title-input" className="text-xs">
                  Document Title
                </Label>
                <Input
                  id="doc-title-input"
                  placeholder="e.g. 2026 Certificate of Rental Insurance"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="doc-drive-file-id" className="text-xs">
                  Google Drive File ID
                </Label>
                <Input
                  id="doc-drive-file-id"
                  placeholder="Drive File ID from Google Picker"
                  value={driveFileId}
                  onChange={(e) => setDriveFileId(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="space-y-1">
                <Label htmlFor="doc-type-select" className="text-xs">
                  Document Type
                </Label>
                <Select
                  value={documentType}
                  onValueChange={(v) => setDocumentType(v as OrganizationDocumentType)}
                >
                  <SelectTrigger id="doc-type-select" aria-label="Document Type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rental_insurance">Rental Insurance</SelectItem>
                    <SelectItem value="policy">Policy / SOP</SelectItem>
                    <SelectItem value="manual">Operator / Service Manual</SelectItem>
                    <SelectItem value="certificate">Safety Certificate</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="doc-renewal-select" className="text-xs">
                  Renewal Cycle
                </Label>
                <Select value={renewalDays} onValueChange={setRenewalDays}>
                  <SelectTrigger id="doc-renewal-select" aria-label="Renewal Cycle">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No renewal cycle</SelectItem>
                    <SelectItem value="30">Every 30 days</SelectItem>
                    <SelectItem value="90">Every 90 days</SelectItem>
                    <SelectItem value="180">Every 180 days</SelectItem>
                    <SelectItem value="365">Every 365 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="doc-web-link" className="text-xs">
                  Drive Web Link (optional)
                </Label>
                <Input
                  id="doc-web-link"
                  placeholder="https://drive.google.com/..."
                  value={webViewLink}
                  onChange={(e) => setWebViewLink(e.target.value)}
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 pt-1">
              {documentType === 'rental_insurance' && scopeType === 'organization' && (
                <div className="flex items-center gap-2 text-xs">
                  <Checkbox
                    id="doc-required-insurance"
                    checked={isRequiredInsurance}
                    onCheckedChange={(checked) => setIsRequiredInsurance(Boolean(checked))}
                  />
                  <Label htmlFor="doc-required-insurance" className="text-xs font-normal">
                    Required for Rental Readiness
                  </Label>
                </div>
              )}

              {scopeType !== 'organization' && scopeType !== 'work_order' && (
                <div className="flex items-center gap-2 text-xs">
                  <Checkbox
                    id="doc-is-override"
                    checked={isOverride}
                    onCheckedChange={(checked) => setIsOverride(Boolean(checked))}
                  />
                  <Label htmlFor="doc-is-override" className="text-xs font-normal">
                    Override higher-scope policy at this {scopeType}
                  </Label>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setShowAttachForm(false)}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm">
                Review Reader Grants & Attach
              </Button>
            </div>
          </form>
        )}

        {isLoading ? (
          <p className="text-xs text-muted-foreground">Loading documents...</p>
        ) : attachments.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No Google Drive documents attached in this scope hierarchy yet.
          </p>
        ) : (
          <div className="divide-y rounded-md border">
            {attachments.map((att) => {
              const doc = att.canonicalDocument;
              const displayTitle = att.snapshot_title || doc?.title || 'Drive Document';
              const isInherited = att.scope_id !== scopeId;

              return (
                <div
                  key={att.id}
                  className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-sm font-medium text-foreground">
                        {displayTitle}
                      </span>
                      <Badge variant="outline" className="text-[10px] capitalize">
                        {att.scope_type}
                      </Badge>
                      {isInherited && (
                        <Badge variant="secondary" className="text-[10px]">
                          Inherited
                        </Badge>
                      )}
                      {att.is_override && (
                        <Badge variant="default" className="text-[10px]">
                          Override
                        </Badge>
                      )}
                      {doc?.document_type === 'rental_insurance' && (
                        <Badge variant="outline" className="text-[10px] border-primary/40 text-primary">
                          Rental Insurance
                        </Badge>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span>Drive ID: {att.snapshot_file_id}</span>
                      {att.snapshot_renewal_days && (
                        <span>Renewal: {att.snapshot_renewal_days}d</span>
                      )}
                      {doc?.last_signed_at && (
                        <span>
                          Signed off:{' '}
                          {formatDate(doc.last_signed_at, defaultUserSettings)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    {doc?.web_view_link && (
                      <Button size="sm" variant="ghost" asChild className="h-7 px-2 text-xs">
                        <a
                          href={doc.web_view_link}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="mr-1 h-3.5 w-3.5" />
                          Open in Drive
                        </a>
                      </Button>
                    )}

                    {canManage && scopeType !== 'work_order' && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 text-xs"
                        onClick={() =>
                          handleResyncDriveAccess(displayTitle, att.granted_reader_emails)
                        }
                      >
                        <RefreshCw className="mr-1 h-3.5 w-3.5" />
                        Re-sync Drive Access
                      </Button>
                    )}

                    {isOrgAdmin && doc && doc.renewal_days && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 text-xs"
                        onClick={() => setSignoffDoc(doc)}
                      >
                        <FileCheck2 className="mr-1 h-3.5 w-3.5" />
                        Sign Off
                      </Button>
                    )}

                    {canManage && !isInherited && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs text-destructive"
                        disabled={removeMutation.isPending}
                        onClick={() =>
                          removeMutation.mutate({
                            organizationId,
                            attachmentId: att.id,
                          })
                        }
                        aria-label={`Remove ${displayTitle}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {scopeType === 'equipment' && fromWorkOrders.length > 0 && (
          <div className="space-y-2 pt-2">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              From Work Orders (Read-Only)
            </h4>
            <div className="divide-y rounded-md border bg-muted/10">
              {fromWorkOrders.map((woAtt) => (
                <div
                  key={woAtt.id}
                  className="flex items-center justify-between px-3 py-2 text-xs"
                >
                  <div>
                    <span className="font-medium text-foreground">
                      {woAtt.snapshot_title}
                    </span>
                    <span className="ml-2 text-muted-foreground">
                      (Work Order {woAtt.scope_id.slice(0, 8)})
                    </span>
                  </div>
                  {woAtt.canonicalDocument?.web_view_link && (
                    <a
                      href={woAtt.canonicalDocument.web_view_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-primary hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Drive
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>

      <AclGrantConfirmationDialog
        open={showAclConfirmation}
        onOpenChange={setShowAclConfirmation}
        documentTitle={title.trim() || 'Selected Drive Document'}
        scopeType={scopeType}
        isOverride={isOverride}
        recipients={readerRecipientsResult.recipients}
        isSubmitting={attachMutation.isPending}
        onConfirm={() => void handleConfirmAttach()}
      />

      <DocumentSignoffDialog
        open={Boolean(signoffDoc)}
        onOpenChange={(open) => {
          if (!open) setSignoffDoc(null);
        }}
        organizationId={organizationId}
        document={signoffDoc}
      />
    </Card>
  );
};
