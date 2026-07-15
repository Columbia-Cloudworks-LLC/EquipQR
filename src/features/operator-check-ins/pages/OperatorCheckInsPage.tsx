import { useMemo, useState } from 'react';
import { ClipboardCheck, FileText, Plus, RotateCcw } from 'lucide-react';
import Page from '@/components/layout/Page';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useOrganization } from '@/contexts/OrganizationContext';
import { usePermissions } from '@/hooks/usePermissions';
import { useSelectedTeam } from '@/hooks/useSelectedTeam';
import { useTeam } from '@/features/teams/hooks/useTeam';
import { useEquipmentSummaries } from '@/features/equipment/hooks/useEquipment';
import {
  useCreateOperatorChecklistTemplate,
  useDeleteOperatorChecklistTemplate,
  useOperatorChecklistTemplates,
  useRestoreOperatorChecklistTemplate,
} from '@/features/operator-check-ins/hooks/useOperatorChecklistTemplates';
import {
  useCreateEquipmentOperatorCheckinAssignment,
  useOrganizationOperatorCheckinAssignments,
} from '@/features/operator-check-ins/hooks/useOperatorCheckinSettings';
import { OperatorChecklistTemplateDialog } from '@/features/operator-check-ins/components/OperatorChecklistTemplateDialog';
import { OperatorCheckinLedgerPanel } from '@/features/operator-check-ins/components/OperatorCheckinLedgerPanel';
import { OperatorChecklistStarterCatalog } from '@/features/operator-check-ins/components/OperatorChecklistStarterCatalog';
import { OperatorTemplateEquipmentAssignmentMenu } from '@/features/operator-check-ins/components/OperatorTemplateEquipmentAssignmentMenu';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ExternalLink } from '@/components/ui/external-link';
import { OPERATOR_DAILY_CHECK_INS_DOCS_URL } from '@/lib/documentationUrl';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  materializeOperatorChecklistStarter,
  OPERATOR_CHECKLIST_STARTER_TEMPLATES,
} from '@/features/operator-check-ins/data/operatorChecklistStarterTemplates';
import { filterEquipmentSummariesBySelectedTeam } from '@/features/equipment/utils/filterEquipmentSummariesBySelectedTeam';
import { filterVisibleOperatorCheckinTemplates } from '@/features/operator-check-ins/utils/operatorCheckinLedgerScope';
import { isDuplicateOperatorCheckinAssignmentError } from '@/features/operator-check-ins/utils/operatorCheckinAssignmentErrors';
import {
  getOperatorCheckinToken,
  rotateOperatorCheckinToken,
} from '@/features/operator-check-ins/services/operatorCheckinSettingsService';
import { operatorCheckinKeys } from '@/features/operator-check-ins/hooks/operatorCheckinKeys';
import type { OperatorChecklistTemplate } from '@/features/operator-check-ins/services/operatorChecklistTemplatesService';
import { useQueryClient } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useAppToast } from '@/hooks/useAppToast';
import { useOperatorCheckinTemplateIdsWithSubmissions } from '@/features/operator-check-ins/hooks/useOperatorCheckinSubmissions';

function OperatorChecklistTemplateSummaryHeader({
  name,
  description,
  trailing,
}: {
  name: string;
  description: string | null;
  trailing: ReactNode;
}) {
  return (
    <CardHeader className="flex flex-row items-start justify-between gap-2">
      <div>
        <CardTitle className="text-lg">{name}</CardTitle>
        {description && (
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        )}
      </div>
      {trailing}
    </CardHeader>
  );
}

export default function OperatorCheckInsPage() {
  const queryClient = useQueryClient();
  const { success: showSuccessToast, error: showErrorToast } = useAppToast();
  const { currentOrganization } = useOrganization();
  const { hasRole } = usePermissions();
  const { selectedTeamId } = useSelectedTeam();
  const { getUserTeamIds } = useTeam();
  const isAdmin = hasRole(['owner', 'admin']);
  const orgId = currentOrganization?.id;
  const { data: templates = [], isLoading } = useOperatorChecklistTemplates(orgId);
  const createTemplateMutation = useCreateOperatorChecklistTemplate(orgId);
  const deleteTemplateMutation = useDeleteOperatorChecklistTemplate(orgId);
  const restoreTemplateMutation = useRestoreOperatorChecklistTemplate(orgId);
  const createAssignmentMutation = useCreateEquipmentOperatorCheckinAssignment();
  const { data: assignments = [], isLoading: assignmentsLoading } =
    useOrganizationOperatorCheckinAssignments(orgId);
  const { data: equipmentSummaries = [], isLoading: equipmentLoading } = useEquipmentSummaries(orgId, {
    userTeamIds: isAdmin ? undefined : getUserTeamIds(),
    isOrgAdmin: isAdmin,
  });
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [cloningStarterId, setCloningStarterId] = useState<string | null>(null);
  const [assigningTemplateId, setAssigningTemplateId] = useState<string | null>(null);
  const [templatePendingDelete, setTemplatePendingDelete] = useState<OperatorChecklistTemplate | null>(null);
  const [showDeletedCheckins, setShowDeletedCheckins] = useState(false);
  const [restoringTemplateId, setRestoringTemplateId] = useState<string | null>(null);

  const activeTemplates = useMemo(
    () => templates.filter((template) => template.is_active),
    [templates],
  );

  const deletedTemplates = useMemo(
    () => templates.filter((template) => !template.is_active),
    [templates],
  );

  const deletedTemplateIds = useMemo(
    () => deletedTemplates.map((template) => template.id),
    [deletedTemplates],
  );
  const { data: templateIdsWithSubmissions = new Set<string>(), isLoading: isRestorableLookupLoading, isError: isRestorableLookupError, refetch: refetchRestorableLookup } =
    useOperatorCheckinTemplateIdsWithSubmissions(orgId, deletedTemplateIds, showDeletedCheckins);

  const visibleDeletedTemplates = useMemo(
    () => filterVisibleOperatorCheckinTemplates(deletedTemplates, showDeletedCheckins),
    [deletedTemplates, showDeletedCheckins],
  );

  const scopedEquipment = useMemo(
    () => filterEquipmentSummariesBySelectedTeam(equipmentSummaries, selectedTeamId),
    [equipmentSummaries, selectedTeamId],
  );

  async function handleCloneStarter(starterId: string) {
    const starter = OPERATOR_CHECKLIST_STARTER_TEMPLATES.find((item) => item.id === starterId);
    if (!starter || !orgId) return;
    setCloningStarterId(starterId);
    try {
      const materialized = materializeOperatorChecklistStarter(starter);
      await createTemplateMutation.mutateAsync({
        organizationId: orgId,
        name: materialized.name,
        description: materialized.description,
        templateData: materialized.templateData,
      });
      showSuccessToast({
        description: `"${starter.name}" cloned into your templates. You can edit it before assigning to equipment.`,
      });
    } catch {
      showErrorToast({ description: 'Unable to clone starter template.' });
    } finally {
      setCloningStarterId(null);
    }
  }

  async function handleAssignTemplateToEquipment(
    template: OperatorChecklistTemplate,
    equipmentIds: string[],
  ) {
    if (!orgId || equipmentIds.length === 0) return;

    setAssigningTemplateId(template.id);
    let assignedCount = 0;
    let qrLinksReady = 0;

    try {
      for (const equipmentId of equipmentIds) {
        try {
          await createAssignmentMutation.mutateAsync({
            organizationId: orgId,
            equipmentId,
            templateId: template.id,
            enabled: true,
          });
          assignedCount += 1;
          qrLinksReady += 1;
        } catch (error) {
          if (!isDuplicateOperatorCheckinAssignmentError(error)) {
            throw error;
          }
          const existing = assignments.find(
            (assignment) =>
              assignment.equipment_id === equipmentId && assignment.template_id === template.id,
          );
          if (!existing) continue;
          // Tokens persist server-side (#1154); only legacy assignments minted
          // before persistence need a rotate to become printable again.
          const existingToken = await getOperatorCheckinToken(existing.id, orgId);
          if (existingToken) {
            queryClient.setQueryData(operatorCheckinKeys.token(existing.id), existingToken);
            continue;
          }
          const rawToken = await rotateOperatorCheckinToken(existing.id);
          queryClient.setQueryData(operatorCheckinKeys.token(existing.id), rawToken);
          qrLinksReady += 1;
        }
      }

      if (assignedCount > 0) {
        showSuccessToast({
          description: `Checklist assigned to ${assignedCount} equipment record${assignedCount === 1 ? '' : 's'}. QR link${qrLinksReady === 1 ? '' : 's'} ready — open each equipment QR Code dialog to print.`,
        });
      } else if (qrLinksReady > 0) {
        showSuccessToast({
          description: `QR link${qrLinksReady === 1 ? '' : 's'} ready for ${qrLinksReady} equipment record${qrLinksReady === 1 ? '' : 's'}. Open QR Code on each equipment record to print.`,
        });
      } else {
        showSuccessToast({ description: 'Selected equipment already has this checklist assigned.' });
      }
    } catch {
      showErrorToast({ description: 'Unable to assign checklist to equipment.' });
    } finally {
      setAssigningTemplateId(null);
    }
  }

  async function handleDeleteTemplate() {
    if (!templatePendingDelete) return;
    try {
      const result = await deleteTemplateMutation.mutateAsync(templatePendingDelete.id);
      if (result.purged) {
        showSuccessToast({
          description: `"${templatePendingDelete.name}" deleted. It had no collected check-ins and was removed completely.`,
        });
      } else {
        const assignmentNote =
          result.disabledAssignmentCount > 0
            ? ` ${result.disabledAssignmentCount} equipment QR link${result.disabledAssignmentCount === 1 ? '' : 's'} disabled.`
            : '';
        showSuccessToast({
          description: `"${templatePendingDelete.name}" archived.${assignmentNote} Collected check-ins remain in the Daily Ledger.`,
        });
      }
      setTemplatePendingDelete(null);
    } catch {
      showErrorToast({ description: 'Unable to delete template.' });
    }
  }

  async function handleRestoreTemplate(template: OperatorChecklistTemplate) {
    setRestoringTemplateId(template.id);
    try {
      const result = await restoreTemplateMutation.mutateAsync(template.id);
      const assignmentNote =
        result.reenabledAssignmentCount > 0
          ? ` ${result.reenabledAssignmentCount} equipment QR link${result.reenabledAssignmentCount === 1 ? '' : 's'} re-enabled.`
          : '';
      showSuccessToast({
        description: `"${template.name}" restored.${assignmentNote}`,
      });
    } catch {
      showErrorToast({ description: 'Unable to restore template.' });
    } finally {
      setRestoringTemplateId(null);
    }
  }

  if (!isAdmin) {
    return (
      <Page maxWidth="7xl" padding="responsive">
        <Alert>
          <AlertDescription>Only organization owners and administrators can manage operator daily check-ins.</AlertDescription>
        </Alert>
      </Page>
    );
  }

  return (
    <Page maxWidth="7xl" padding="responsive">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Daily Check-Ins</h1>
          <p className="text-muted-foreground mt-1">
            Define operator safety checklists, assign them on each equipment record, and review daily audit ledgers.
          </p>
          <p className="mt-2 text-sm">
            <ExternalLink href={OPERATOR_DAILY_CHECK_INS_DOCS_URL}>
              Learn how Daily Operator Check-Ins work
            </ExternalLink>
          </p>
        </div>

      <Alert>
        <AlertDescription>
          Records support safety and audit documentation. They do not certify legal or regulatory compliance.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="templates" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TabsList>
            <TabsTrigger value="templates" className="gap-2">
              <ClipboardCheck className="h-4 w-4" />
              Templates
            </TabsTrigger>
            <TabsTrigger value="ledger" className="gap-2">
              <FileText className="h-4 w-4" />
              Daily Ledger
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2 rounded-md border border-dashed px-3 py-2">
            <Label htmlFor="show-deleted-checkins-page" className="text-sm font-normal">
              Show deleted check-ins
            </Label>
            <Switch
              id="show-deleted-checkins-page"
              checked={showDeletedCheckins}
              onCheckedChange={setShowDeletedCheckins}
              aria-label="Show deleted check-ins"
            />
          </div>
        </div>

        <TabsContent value="templates" className="space-y-6">
          {isLoading ? (
            <p className="text-muted-foreground text-sm">Loading templates…</p>
          ) : (
            <>
              {orgId && (
                <OperatorChecklistStarterCatalog
                  organizationId={orgId}
                  hasExistingTemplates={templates.length > 0}
                  cloningStarterId={cloningStarterId}
                  isCloning={createTemplateMutation.isPending}
                  onClone={(id) => void handleCloneStarter(id)}
                />
              )}

              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-sm font-medium">Your Templates</h2>
                  <Button
                    onClick={() => {
                      setEditingTemplateId(null);
                      setTemplateDialogOpen(true);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    New Template
                  </Button>
                </div>

                {activeTemplates.length === 0 ? (
                  <Card>
                    <CardContent className="py-8 text-center text-muted-foreground">
                      Clone a starter template from the catalog above, or create a custom checklist from scratch.
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {activeTemplates.map((template) => (
                      <Card key={template.id}>
                        <OperatorChecklistTemplateSummaryHeader
                          name={template.name}
                          description={template.description}
                          trailing={
                            <div className="flex gap-2">
                              {!template.is_active && <Badge variant="outline">Inactive</Badge>}
                              <Badge variant="secondary">
                                {template.template_data.dataFields.length} data field{template.template_data.dataFields.length === 1 ? '' : 's'}
                              </Badge>
                            </div>
                          }
                        />
                        <CardContent className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-sm text-muted-foreground">
                            {template.template_data.checklistItems.length} checklist item{template.template_data.checklistItems.length === 1 ? '' : 's'}
                          </span>
                          <div className="flex flex-wrap gap-2">
                            <OperatorTemplateEquipmentAssignmentMenu
                              templateId={template.id}
                              templateName={template.name}
                              equipment={scopedEquipment}
                              assignments={assignments}
                              isEquipmentLoading={equipmentLoading}
                              isAssignmentsLoading={assignmentsLoading}
                              isAssigning={assigningTemplateId === template.id}
                              onAssignEquipmentIds={(equipmentIds) =>
                                void handleAssignTemplateToEquipment(template, equipmentIds)
                              }
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditingTemplateId(template.id);
                                setTemplateDialogOpen(true);
                              }}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setTemplatePendingDelete(template)}
                            >
                              Delete
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>

              {showDeletedCheckins && deletedTemplates.length > 0 && (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2 className="text-sm font-medium">Deleted Check-Ins</h2>
                    <Badge variant="outline">{deletedTemplates.length} archived</Badge>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    {visibleDeletedTemplates.map((template) => {
                      const canRestore = templateIdsWithSubmissions.has(template.id);

                      return (
                      <Card key={template.id}>
                        <OperatorChecklistTemplateSummaryHeader
                          name={template.name}
                          description={template.description}
                          trailing={<Badge variant="outline">Deleted</Badge>}
                        />
                        <CardContent className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-sm text-muted-foreground">
                            {canRestore
                              ? 'Historical ledger data is preserved. Restore to resume QR use.'
                              : 'No collected check-ins. Delete to remove this archived template completely.'}
                          </span>
                          {isRestorableLookupError ? (
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-destructive">Unable to verify ledger data.</span>
                              <Button variant="outline" size="sm" onClick={() => void refetchRestorableLookup()}>
                                Retry
                              </Button>
                            </div>
                          ) : isRestorableLookupLoading ? (
                            <span className="text-sm text-muted-foreground">Checking ledger data…</span>
                          ) : canRestore ? (
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={restoringTemplateId === template.id}
                              onClick={() => void handleRestoreTemplate(template)}
                            >
                              <RotateCcw className="h-4 w-4 mr-2" />
                              Restore
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setTemplatePendingDelete(template)}
                            >
                              Delete
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="ledger">
          {orgId && (
            <OperatorCheckinLedgerPanel
              organizationId={orgId}
              showDeletedCheckins={showDeletedCheckins}
              onShowDeletedCheckinsChange={setShowDeletedCheckins}
              allowDeletedVisibilityToggle
            />
          )}
        </TabsContent>
      </Tabs>

      {orgId && (
        <OperatorChecklistTemplateDialog
          open={templateDialogOpen}
          onOpenChange={setTemplateDialogOpen}
          organizationId={orgId}
          templateId={editingTemplateId}
        />
      )}

      <AlertDialog
        open={templatePendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setTemplatePendingDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete template?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>
                  Delete <strong className="text-foreground">{templatePendingDelete?.name}</strong> from
                  active template management?
                </p>
                <p>
                  Templates with collected check-ins are archived so the Daily Ledger and exports
                  keep historical data. Unused templates are removed completely.
                </p>
                <p>Existing QR links for this template will stop working.</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteTemplateMutation.isPending}
              onClick={() => void handleDeleteTemplate()}
            >
              Delete template
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
    </Page>
  );
}
