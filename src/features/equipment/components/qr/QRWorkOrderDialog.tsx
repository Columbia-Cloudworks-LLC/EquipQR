import React, { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AlertCircle, Globe, Info, Loader2, Target, Zap } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { WorkOrder, WorkOrderPriority } from '@/features/work-orders/types/workOrder';
import {
  canRunQRAction,
  type QRActionEquipment,
  type QRActionPermissionContext,
} from '@/features/equipment/services/equipmentQRPermissions';
import { createQRWorkOrder } from '@/features/equipment/services/equipmentQRActionService';
import { logger } from '@/utils/logger';
import { workOrders, workOrderMetrics } from '@/lib/queryKeys';
import WorkOrderCreationPhotoPicker from '@/features/work-orders/components/WorkOrderCreationPhotoPicker';
import { OFFLINE_CREATION_PHOTOS_MESSAGE } from '@/features/work-orders/utils/workOrderCreationImages';
import { toast } from 'sonner';
import type { PMTemplateSummary } from '@/features/pm-templates/services/pmChecklistTemplatesService';
import { usePMTemplatesForOrganization } from '@/features/pm-templates/hooks/usePMTemplates';
import { useMatchingPMTemplatesForEquipment } from '@/features/pm-templates/hooks/usePMTemplateCompatibility';
import { getSimplifiedOrganizationRestrictions } from '@/utils/simplifiedOrganizationRestrictions';

interface QRWorkOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  equipment: QRActionEquipment;
  permissionContext: QRActionPermissionContext | null;
  scanId?: string | null;
  mode: 'pm' | 'generic';
  onCreated: (workOrder: WorkOrder) => void;
}

const priorityOptions: WorkOrderPriority[] = ['low', 'medium', 'high'];

type MatchedTemplateSummary = PMTemplateSummary & { matchType?: 'model' | 'manufacturer' };

const QRWorkOrderDialog: React.FC<QRWorkOrderDialogProps> = ({
  open,
  onOpenChange,
  equipment,
  permissionContext,
  scanId,
  mode,
  onCreated,
}) => {
  const isPM = mode === 'pm';
  const needsPmTemplateChoice = isPM && !equipment.defaultPmTemplateId;

  const [title, setTitle] = useState(
    isPM ? `Preventative maintenance - ${equipment.name}` : `Work order - ${equipment.name}`
  );
  const [description, setDescription] = useState(
    isPM
      ? `Preventative maintenance work order created from QR scan for ${equipment.name}.`
      : `Work order created from QR scan for ${equipment.name}.`
  );
  const [priority, setPriority] = useState<WorkOrderPriority>('medium');
  const [dueDate, setDueDate] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [images, setImages] = useState<File[]>([]);
  const [pmTemplateId, setPmTemplateId] = useState('');
  const queryClient = useQueryClient();

  const templatesQuery = usePMTemplatesForOrganization(equipment.organizationId, {
    enabled: open && needsPmTemplateChoice,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });

  const matchingQuery = useMatchingPMTemplatesForEquipment(
    equipment.organizationId,
    equipment.id,
    {
      enabled: open && needsPmTemplateChoice,
      staleTime: 10 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
    }
  );

  const { matchedTemplates, otherTemplates } = useMemo(() => {
    if (!needsPmTemplateChoice || !templatesQuery.data) {
      return { matchedTemplates: [] as MatchedTemplateSummary[], otherTemplates: [] as PMTemplateSummary[] };
    }

    const restrictions = getSimplifiedOrganizationRestrictions();
    const allSummaries = templatesQuery.data;
    const availableTemplates = restrictions.canCreateCustomPMTemplates
      ? allSummaries
      : allSummaries.filter(t => !t.organization_id);

    const matchingRows = matchingQuery.isError ? [] : (matchingQuery.data ?? []);
    const matchByTemplateId = new Map(matchingRows.map(row => [row.template_id, row]));
    const matchedIds = new Set(matchingRows.map(m => m.template_id));

    const matched: MatchedTemplateSummary[] = [];
    const other: PMTemplateSummary[] = [];

    for (const template of availableTemplates) {
      if (matchedIds.has(template.id)) {
        const matchInfo = matchByTemplateId.get(template.id);
        matched.push({
          ...template,
          matchType: matchInfo?.match_type,
        });
      } else {
        other.push(template);
      }
    }

    matched.sort((a, b) => {
      if (a.matchType === 'model' && b.matchType !== 'model') return -1;
      if (a.matchType !== 'model' && b.matchType === 'model') return 1;
      return a.name.localeCompare(b.name);
    });

    other.sort((a, b) => a.name.localeCompare(b.name));

    return { matchedTemplates: matched, otherTemplates: other };
  }, [needsPmTemplateChoice, templatesQuery.data, matchingQuery.data, matchingQuery.isError]);

  useEffect(() => {
    if (!open) {
      setImages([]);
    }
  }, [open]);

  useEffect(() => {
    if (open && needsPmTemplateChoice) {
      setPmTemplateId('');
    }
  }, [open, needsPmTemplateChoice, equipment.id]);

  const templatesListLoading = needsPmTemplateChoice && templatesQuery.isPending;
  const templatesListError = needsPmTemplateChoice && templatesQuery.isError;
  const matchingRecommendationsError = needsPmTemplateChoice && matchingQuery.isError;

  const noTemplatesAvailable =
    needsPmTemplateChoice &&
    !templatesListLoading &&
    !templatesListError &&
    matchedTemplates.length === 0 &&
    otherTemplates.length === 0;

  const submitBlockedForPmTemplate =
    needsPmTemplateChoice &&
    (!pmTemplateId || templatesListLoading || templatesListError || noTemplatesAvailable);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!title.trim() || !description.trim()) {
      setError('Title and description are required.');
      return;
    }

    const action = isPM ? 'pm-work-order' : 'generic-work-order';
    if (
      !permissionContext ||
      !canRunQRAction(action, permissionContext, equipment.teamId)
    ) {
      setError('Permission changed. Re-open this action to continue.');
      return;
    }

    if (needsPmTemplateChoice) {
      if (templatesListLoading) {
        setError('Templates are still loading. Please wait a moment and try again.');
        return;
      }
      if (templatesListError) {
        setError('Unable to load PM templates. Check your connection and try again.');
        return;
      }
      if (noTemplatesAvailable) {
        setError('No PM checklist templates are available for this organization.');
        return;
      }
      if (!pmTemplateId) {
        setError('Select a PM checklist template before creating this work order.');
        return;
      }
    }

    if (images.length > 0 && typeof navigator !== 'undefined' && !navigator.onLine) {
      setError(OFFLINE_CREATION_PHOTOS_MESSAGE);
      return;
    }

    setIsSubmitting(true);
    try {
      const { workOrder, creationPhotosAttached } = await createQRWorkOrder({
        equipment,
        title: title.trim(),
        description: description.trim(),
        priority,
        dueDate: dueDate || undefined,
        attachPM: isPM,
        pmTemplateId: needsPmTemplateChoice ? pmTemplateId : undefined,
        images: images.length ? images : undefined,
        creationPhotoNote: images.length
          ? `Photos from QR work order request: ${title.trim()}`
          : undefined,
        scanId,
      });
      if (images.length > 0) {
        queryClient.invalidateQueries({ queryKey: workOrders.images(workOrder.id) });
        queryClient.invalidateQueries({
          queryKey: workOrders.notesWithImages(workOrder.id),
        });
        queryClient.invalidateQueries({
          queryKey: workOrderMetrics.imageCount(workOrder.id),
        });
        if (!creationPhotosAttached) {
          toast.warning(
            'Work order created, but photos did not attach. Open the work order to retry.',
          );
        }
      }
      setImages([]);
      onCreated(workOrder);
      onOpenChange(false);
    } catch (submitError) {
      logger.error('QR work order creation failed', submitError);
      setError(submitError instanceof Error ? submitError.message : 'Failed to create work order.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={isSubmitting ? undefined : onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isPM ? 'New Preventative Maintenance Work Order' : 'Create New Generic Work Order'}
          </DialogTitle>
          <DialogDescription>
            Create a work order pre-populated with {equipment.name} without opening the full dashboard.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit}>
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="qr-work-order-title">Title</Label>
            <Input
              id="qr-work-order-title"
              value={title}
              onChange={event => setTitle(event.target.value)}
              disabled={isSubmitting}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="qr-work-order-description">Description</Label>
            <Textarea
              id="qr-work-order-description"
              value={description}
              onChange={event => setDescription(event.target.value)}
              disabled={isSubmitting}
              rows={4}
              required
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="qr-work-order-priority">Priority</Label>
              <Select
                value={priority}
                onValueChange={value => setPriority(value as WorkOrderPriority)}
                disabled={isSubmitting}
              >
                <SelectTrigger id="qr-work-order-priority">
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  {priorityOptions.map(option => (
                    <SelectItem key={option} value={option}>
                      {option.charAt(0).toUpperCase() + option.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="qr-work-order-due-date">Due Date (Optional)</Label>
              <Input
                id="qr-work-order-due-date"
                type="date"
                value={dueDate}
                onChange={event => setDueDate(event.target.value)}
                disabled={isSubmitting}
              />
            </div>
          </div>

          {isPM && equipment.defaultPmTemplateId && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                This will attach the equipment&apos;s assigned default PM template.
              </AlertDescription>
            </Alert>
          )}

          {needsPmTemplateChoice && (
            <div className="space-y-2">
              {templatesListLoading && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading templates…
                </div>
              )}
              {templatesListError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>Could not load PM templates. Try again.</AlertDescription>
                </Alert>
              )}
              {noTemplatesAvailable && !templatesListLoading && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    No PM checklist templates are available. Ask an admin to add templates or assign a default on
                    the equipment record.
                  </AlertDescription>
                </Alert>
              )}
              {!templatesListLoading && !templatesListError && !noTemplatesAvailable && (
                <>
                  <Label id="qr-pm-template-label">PM checklist template</Label>
                  {matchingRecommendationsError && (
                    <div className="flex items-start gap-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                      <span>
                        Recommendations unavailable. All templates are listed below; pick the checklist that fits this
                        equipment.
                      </span>
                    </div>
                  )}
                  {matchedTemplates.length > 0 && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Target className="h-3 w-3 text-primary" aria-hidden />
                      <span>
                        {matchedTemplates.length} recommended template
                        {matchedTemplates.length !== 1 ? 's' : ''} for this equipment
                      </span>
                    </div>
                  )}
                  <Select
                    value={pmTemplateId}
                    onValueChange={setPmTemplateId}
                    disabled={isSubmitting}
                    required
                  >
                    <SelectTrigger
                      id="qr-pm-template-select"
                      aria-labelledby="qr-pm-template-label"
                    >
                      <SelectValue placeholder="Select a checklist template…" />
                    </SelectTrigger>
                    <SelectContent>
                      {matchedTemplates.length > 0 && (
                        <SelectGroup>
                          <SelectLabel className="flex items-center gap-1">
                            <Zap className="h-3 w-3" aria-hidden />
                            Recommended for this equipment
                          </SelectLabel>
                          {matchedTemplates.map(template => (
                            <SelectItem key={template.id} value={template.id}>
                              <div className="flex items-center gap-2">
                                <span>{template.name}</span>
                                {template.matchType === 'model' && (
                                  <span className="text-xs text-primary">(exact match)</span>
                                )}
                                {template.matchType === 'manufacturer' && (
                                  <span className="text-xs text-muted-foreground">(manufacturer)</span>
                                )}
                                {template.organization_id === null && (
                                  <Globe className="h-3 w-3 text-muted-foreground" aria-hidden />
                                )}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      )}
                      {otherTemplates.length > 0 && (
                        <SelectGroup>
                          {matchedTemplates.length > 0 && <SelectLabel>Other templates</SelectLabel>}
                          {otherTemplates.map(template => (
                            <SelectItem key={template.id} value={template.id}>
                              <div className="flex items-center gap-2">
                                <span>{template.name}</span>
                                {template.organization_id === null && (
                                  <span className="text-xs text-muted-foreground">(Global)</span>
                                )}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      )}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    This equipment has no default PM template. Your choice applies only to this work order.
                  </p>
                </>
              )}
            </div>
          )}

          <WorkOrderCreationPhotoPicker
            images={images}
            onImagesChange={setImages}
            disabled={isSubmitting}
          />

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || submitBlockedForPmTemplate}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Work Order
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default QRWorkOrderDialog;
