import { useMemo, useState } from 'react';
import { ClipboardCheck, FileText, Plus } from 'lucide-react';
import { toast } from 'sonner';
import Page from '@/components/layout/Page';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useOrganization } from '@/contexts/OrganizationContext';
import { usePermissions } from '@/hooks/usePermissions';
import { useSelectedTeam } from '@/hooks/useSelectedTeam';
import { useTeam } from '@/features/teams/hooks/useTeam';
import { useEquipmentSummaries } from '@/features/equipment/hooks/useEquipment';
import {
  useCreateOperatorChecklistTemplate,
  useDeleteOperatorChecklistTemplate,
  useOperatorChecklistTemplates,
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
import { isDuplicateOperatorCheckinAssignmentError } from '@/features/operator-check-ins/utils/operatorCheckinAssignmentErrors';
import {
  getOperatorCheckinToken,
  rotateOperatorCheckinToken,
} from '@/features/operator-check-ins/services/operatorCheckinSettingsService';
import { operatorCheckinKeys } from '@/features/operator-check-ins/hooks/operatorCheckinKeys';
import type { OperatorChecklistTemplate } from '@/features/operator-check-ins/services/operatorChecklistTemplatesService';
import { useQueryClient } from '@tanstack/react-query';

export default function OperatorCheckInsPage() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useOrganization();
  const { hasRole } = usePermissions();
  const { selectedTeamId } = useSelectedTeam();
  const { getUserTeamIds } = useTeam();
  const isAdmin = hasRole(['owner', 'admin']);
  const orgId = currentOrganization?.id;
  const { data: templates = [], isLoading } = useOperatorChecklistTemplates(orgId);
  const createTemplateMutation = useCreateOperatorChecklistTemplate(orgId);
  const deleteTemplateMutation = useDeleteOperatorChecklistTemplate(orgId);
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

  const activeTemplates = useMemo(
    () => templates.filter((template) => template.is_active),
    [templates],
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
      toast.success(
        `"${starter.name}" cloned into your templates. You can edit it before assigning to equipment.`,
      );
    } catch {
      toast.error('Unable to clone starter template.');
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
        toast.success(
          `Checklist assigned to ${assignedCount} equipment record${assignedCount === 1 ? '' : 's'}. QR link${qrLinksReady === 1 ? '' : 's'} ready — open each equipment QR Code dialog to print.`,
        );
      } else if (qrLinksReady > 0) {
        toast.success(
          `QR link${qrLinksReady === 1 ? '' : 's'} ready for ${qrLinksReady} equipment record${qrLinksReady === 1 ? '' : 's'}. Open QR Code on each equipment record to print.`,
        );
      } else {
        toast.success('Selected equipment already has this checklist assigned.');
      }
    } catch {
      toast.error('Unable to assign checklist to equipment.');
    } finally {
      setAssigningTemplateId(null);
    }
  }

  async function handleDeleteTemplate() {
    if (!templatePendingDelete) return;
    try {
      const result = await deleteTemplateMutation.mutateAsync(templatePendingDelete.id);
      const assignmentNote =
        result.disabledAssignmentCount > 0
          ? ` ${result.disabledAssignmentCount} equipment QR link${result.disabledAssignmentCount === 1 ? '' : 's'} disabled.`
          : '';
      toast.success(
        `"${templatePendingDelete.name}" deleted.${assignmentNote} Collected check-ins remain in the Daily Ledger.`,
      );
      setTemplatePendingDelete(null);
    } catch {
      toast.error('Unable to delete template.');
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
                        <CardHeader className="flex flex-row items-start justify-between gap-2">
                          <div>
                            <CardTitle className="text-lg">{template.name}</CardTitle>
                            {template.description && (
                              <p className="text-sm text-muted-foreground mt-1">{template.description}</p>
                            )}
                          </div>
                          <div className="flex gap-2">
                            {!template.is_active && <Badge variant="outline">Inactive</Badge>}
                            <Badge variant="secondary">
                              {template.template_data.dataFields.length} data field{template.template_data.dataFields.length === 1 ? '' : 's'}
                            </Badge>
                          </div>
                        </CardHeader>
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
            </>
          )}
        </TabsContent>

        <TabsContent value="ledger">
          {orgId && <OperatorCheckinLedgerPanel organizationId={orgId} />}
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
                  Collected check-ins remain available in the Daily Ledger and report exports.
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
