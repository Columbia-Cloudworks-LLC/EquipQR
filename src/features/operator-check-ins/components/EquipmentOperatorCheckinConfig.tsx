import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ClipboardSignature,
  MoreVertical,
  QrCode,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ExternalLink } from '@/components/ui/external-link';
import { OPERATOR_DAILY_CHECK_INS_DOCS_URL } from '@/lib/documentationUrl';
import { useOperatorChecklistTemplates } from '@/features/operator-check-ins/hooks/useOperatorChecklistTemplates';
import {
  useCreateEquipmentOperatorCheckinAssignment,
  useDeleteEquipmentOperatorCheckinAssignment,
  useEquipmentOperatorCheckinAssignments,
  useOperatorCheckinToken,
  useRotateOperatorCheckinToken,
} from '@/features/operator-check-ins/hooks/useOperatorCheckinSettings';
import type { EquipmentOperatorCheckinAssignment } from '@/features/operator-check-ins/services/operatorCheckinSettingsService';
import { isDuplicateOperatorCheckinAssignmentError } from '@/features/operator-check-ins/utils/operatorCheckinAssignmentErrors';
import { EquipmentOperatorCheckinTemplateAssignmentMenu } from './EquipmentOperatorCheckinTemplateAssignmentMenu';

interface EquipmentOperatorCheckinConfigProps {
  organizationId: string;
  equipmentId: string;
  equipmentName: string;
  onOpenQrCodeForAssignment: (assignmentId: string) => void;
}

function AssignedChecklistRow({
  assignment,
  isBusy,
  onRotateToken,
  onRemove,
  onViewQrCode,
}: {
  assignment: EquipmentOperatorCheckinAssignment;
  isBusy: boolean;
  onRotateToken: () => void;
  onRemove: () => void;
  onViewQrCode: () => void;
}) {
  const { data: storedToken = null, isPending: isTokenPending } = useOperatorCheckinToken(
    assignment.id,
    assignment.organization_id,
  );
  const hasStoredToken = Boolean(storedToken);
  const [rotateDialogOpen, setRotateDialogOpen] = useState(false);

  const templateName = assignment.template?.name ?? 'Checklist';

  const handleRotateRequest = () => {
    if (hasStoredToken || isTokenPending) {
      setRotateDialogOpen(true);
      return;
    }
    onRotateToken();
  };

  const handleConfirmRotate = () => {
    setRotateDialogOpen(false);
    onRotateToken();
  };

  return (
    <li className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="font-medium leading-tight">{templateName}</p>
        {assignment.enabled && !hasStoredToken && !isTokenPending && (
          <p className="mt-1 text-xs text-muted-foreground">
            Generate a QR link from the actions menu before printing.
          </p>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <Button type="button" variant="outline" size="sm" disabled={isBusy} onClick={onViewQrCode}>
          <QrCode className="mr-2 h-4 w-4" />
          View QR code
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-9 w-9 shrink-0 touch-manipulation"
              disabled={isBusy}
              aria-label={`${templateName} checklist actions`}
            >
              <MoreVertical className="h-4 w-4" aria-hidden />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="top" className="w-52">
            <DropdownMenuItem onSelect={handleRotateRequest}>
              <RefreshCw className="mr-2 h-4 w-4" />
              {hasStoredToken || isTokenPending ? 'Rotate QR link' : 'Generate QR link'}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onSelect={onRemove}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Remove checklist
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <AlertDialog open={rotateDialogOpen} onOpenChange={setRotateDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rotate QR link for {templateName}?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <span className="block">
                This replaces the public check-in link for this checklist. Any printed or shared QR codes
                for {templateName} will stop working immediately.
              </span>
              <span className="block">
                Plan to physically replace old QR codes with the new one before operators scan again.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBusy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isBusy}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleConfirmRotate}
            >
              Rotate QR link
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </li>
  );
}

export function EquipmentOperatorCheckinConfig({
  organizationId,
  equipmentId,
  equipmentName,
  onOpenQrCodeForAssignment,
}: EquipmentOperatorCheckinConfigProps) {
  const { data: templates = [], isLoading: templatesLoading } =
    useOperatorChecklistTemplates(organizationId);
  const { data: assignments = [], isLoading: assignmentsLoading } =
    useEquipmentOperatorCheckinAssignments(equipmentId, organizationId);
  const createMutation = useCreateEquipmentOperatorCheckinAssignment();
  const deleteMutation = useDeleteEquipmentOperatorCheckinAssignment(equipmentId, organizationId);
  const rotateMutation = useRotateOperatorCheckinToken(equipmentId, organizationId);

  const isBusy =
    createMutation.isPending ||
    deleteMutation.isPending ||
    rotateMutation.isPending;

  const activeTemplateCount = useMemo(
    () => templates.filter((template) => template.is_active).length,
    [templates],
  );

  async function handleAssignTemplateIds(templateIds: string[]) {
    if (templateIds.length === 0) return;

    let assignedCount = 0;
    try {
      for (const templateId of templateIds) {
        try {
          await createMutation.mutateAsync({
            organizationId,
            equipmentId,
            templateId,
            enabled: true,
          });
          assignedCount += 1;
        } catch (error) {
          if (!isDuplicateOperatorCheckinAssignmentError(error)) {
            throw error;
          }
        }
      }

      if (assignedCount > 0) {
        toast.success(
          `Assigned ${assignedCount} checklist${assignedCount === 1 ? '' : 's'}. Open View QR code on each row to print or share.`,
        );
      } else {
        toast.success('Selected checklists are already assigned to this equipment.');
      }
    } catch {
      toast.error('Unable to assign checklists.');
    }
  }

  async function handleRotateToken(assignmentId: string) {
    try {
      await rotateMutation.mutateAsync(assignmentId);
      toast.success('QR link updated. Open View QR code to print or share it.');
    } catch {
      toast.error('Unable to rotate QR link.');
    }
  }

  async function handleRemove(assignmentId: string) {
    try {
      await deleteMutation.mutateAsync(assignmentId);
      toast.success('Checklist removed from this equipment.');
    } catch {
      toast.error('Unable to remove checklist.');
    }
  }

  if (templatesLoading || assignmentsLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Daily Operator Check-In</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-16 animate-pulse rounded bg-muted" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <ClipboardSignature className="h-4 w-4" />
          Daily Operator Check-In
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Assign one or more checklists for unauthenticated operator daily check-ins on {equipmentName}.
          Assigned checklists are public by default and can be removed when no longer needed. Each checklist gets its own QR link — use the <strong>QR Code</strong> action above to print.{' '}
          <ExternalLink href={OPERATOR_DAILY_CHECK_INS_DOCS_URL} className="text-sm">
            Setup, QR placement, and assignment guide
          </ExternalLink>
        </p>

        {templates.length === 0 ? (
          <Alert>
            <AlertDescription>
              Create an operator checklist template first on the{' '}
              <Link to="/dashboard/operator-check-ins" className="text-primary underline">
                Daily Check-Ins
              </Link>{' '}
              page.
            </AlertDescription>
          </Alert>
        ) : (
          <>
            {assignments.length > 0 ? (
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">
                  {assignments.length} checklist{assignments.length === 1 ? '' : 's'} assigned
                </p>
                <ul className="divide-y rounded-lg border">
                  {assignments.map((assignment) => (
                    <AssignedChecklistRow
                      key={assignment.id}
                      assignment={assignment}
                      isBusy={isBusy}
                      onRotateToken={() => void handleRotateToken(assignment.id)}
                      onRemove={() => void handleRemove(assignment.id)}
                      onViewQrCode={() => onOpenQrCodeForAssignment(assignment.id)}
                    />
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No daily check-in checklists assigned yet.</p>
            )}

            {activeTemplateCount > 0 ? (
              <EquipmentOperatorCheckinTemplateAssignmentMenu
                equipmentId={equipmentId}
                equipmentName={equipmentName}
                templates={templates}
                assignments={assignments}
                assignedCount={assignments.length}
                isTemplatesLoading={templatesLoading}
                isAssignmentsLoading={assignmentsLoading}
                isAssigning={createMutation.isPending}
                onAssignTemplateIds={handleAssignTemplateIds}
              />
            ) : (
              <p className="text-xs text-muted-foreground">
                All templates are inactive. Reactivate or create a template on the Daily Check-Ins page.
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
