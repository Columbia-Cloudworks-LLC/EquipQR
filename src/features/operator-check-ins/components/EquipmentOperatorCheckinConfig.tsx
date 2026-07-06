import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ClipboardSignature,
  MoreVertical,
  Plus,
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
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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

interface EquipmentOperatorCheckinConfigProps {
  organizationId: string;
  equipmentId: string;
  equipmentName: string;
  onOpenQrCodeForAssignment: (assignmentId: string) => void;
}

function AssignmentRow({
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
  const { data: storedToken = null } = useOperatorCheckinToken(
    assignment.id,
    assignment.organization_id,
  );
  const hasStoredToken = Boolean(storedToken);
  const [rotateDialogOpen, setRotateDialogOpen] = useState(false);

  const templateName = assignment.template?.name ?? 'Checklist';

  const handleRotateRequest = () => {
    if (hasStoredToken) {
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
    <div className="rounded-lg border p-4 space-y-3">
      <p className="font-medium">{templateName}</p>

      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-2">
          <Button type="button" variant="outline" size="sm" disabled={isBusy} onClick={onViewQrCode}>
            <QrCode className="mr-2 h-4 w-4" />
            View QR code
          </Button>
          {assignment.enabled && !hasStoredToken && (
            <p className="text-xs text-muted-foreground">
              Open the actions menu to generate a QR link for this checklist. Generated links stay
              available to owners and admins on any device.
            </p>
          )}
        </div>

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
              {hasStoredToken ? 'Rotate QR link' : 'Generate QR link'}
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
    </div>
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

  const [adding, setAdding] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');

  const isBusy =
    createMutation.isPending ||
    deleteMutation.isPending ||
    rotateMutation.isPending;

  const assignedTemplateIds = useMemo(
    () => new Set(assignments.map((assignment) => assignment.template_id)),
    [assignments],
  );

  const availableTemplates = useMemo(
    () => templates.filter((template) => template.is_active && !assignedTemplateIds.has(template.id)),
    [templates, assignedTemplateIds],
  );

  async function handleAddAssignment() {
    if (!selectedTemplateId) return;
    try {
      await createMutation.mutateAsync({
        organizationId,
        equipmentId,
        templateId: selectedTemplateId,
        enabled: true,
      });
      setSelectedTemplateId('');
      setAdding(false);
      toast.success('Checklist assigned. QR link is ready — open View QR code to print or share.');
    } catch {
      toast.error('Unable to assign checklist.');
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
            {assignments.length > 0 && (
              <div className="space-y-3">
                {assignments.map((assignment) => (
                  <AssignmentRow
                    key={assignment.id}
                    assignment={assignment}
                    isBusy={isBusy}
                    onRotateToken={() => void handleRotateToken(assignment.id)}
                    onRemove={() => void handleRemove(assignment.id)}
                    onViewQrCode={() => onOpenQrCodeForAssignment(assignment.id)}
                  />
                ))}
              </div>
            )}

            {assignments.length === 0 && !adding && (
              <p className="text-sm text-muted-foreground">No daily check-in checklists assigned yet.</p>
            )}

            {adding ? (
              <div className="space-y-3 rounded-lg border border-dashed p-4">
                <Label htmlFor={`add-checkin-template-${equipmentId}`}>Checklist template</Label>
                <Select
                  value={selectedTemplateId}
                  onValueChange={setSelectedTemplateId}
                  disabled={isBusy || availableTemplates.length === 0}
                >
                  <SelectTrigger id={`add-checkin-template-${equipmentId}`}>
                    <SelectValue placeholder="Select a template" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTemplates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    disabled={isBusy || !selectedTemplateId}
                    onClick={() => void handleAddAssignment()}
                  >
                    Save assignment
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={isBusy}
                    onClick={() => {
                      setAdding(false);
                      setSelectedTemplateId('');
                    }}
                  >
                    Cancel
                  </Button>
                </div>
                {availableTemplates.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    All active templates are already assigned to this equipment.
                  </p>
                )}
              </div>
            ) : (
              availableTemplates.length > 0 && (
                <Button type="button" variant="outline" size="sm" disabled={isBusy} onClick={() => setAdding(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add check-in checklist
                </Button>
              )
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
