import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { SegmentedPills, type SegmentedPillOption } from '@/components/ui/segmented-pills';
import { CheckCircle2 } from 'lucide-react';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useSession } from '@/hooks/useSession';
import { usePermissions } from '@/hooks/usePermissions';
import { useUnifiedPermissions } from '@/hooks/useUnifiedPermissions';
import { isQuickBooksEnabled } from '@/lib/flags';
import type { WorkOrder, WorkOrderPriority } from '@/features/work-orders/types/workOrder';
import { useWorkOrderForm, WorkOrderFormData } from '@/features/work-orders/hooks/useWorkOrderForm';
import { useEquipmentSelection } from '@/features/equipment/components/hooks/useEquipmentSelection';
import { useWorkOrderSubmission } from '@/features/work-orders/hooks/useWorkOrderSubmission';
import { useLogCompletedChecklist } from '@/features/work-orders/hooks/useLogCompletedChecklist';
import { toEquipmentSelectorItem } from '@/features/work-orders/utils/toEquipmentSelectorItem';
import {
  parseServiceDateInput,
  serviceDateDaysAgo,
  serviceDateInputValue,
  todayServiceDate,
} from '@/features/work-orders/utils/serviceDate';
import type { PMTemplateSummary } from '@/features/pm-templates/services/pmChecklistTemplatesService';
import { WorkOrderFormHeader } from './WorkOrderFormHeader';
import { WorkOrderScheduling } from './WorkOrderScheduling';
import { WorkOrderAssignment } from './WorkOrderAssignment';
import { WorkOrderEquipmentSelector } from './WorkOrderEquipmentSelector';
import { WorkOrderPMChecklist } from './WorkOrderPMChecklist';
import { WorkOrderPMToggle } from './WorkOrderPMToggle';
import { WorkOrderPriorityPills } from './WorkOrderPriorityPills';
import { WorkOrderPinToggle } from './WorkOrderPinToggle';
import { WorkOrderSymptomChips } from './WorkOrderSymptomChips';
import {
  applySymptomChipToTitle,
  type WorkOrderSymptomChip,
} from '@/features/work-orders/utils/symptomChips';
import { WorkOrderAttachmentDropzone } from './WorkOrderAttachmentDropzone';
import { LogCompletedPMChecklist } from './LogCompletedPMChecklist';
import { cn } from '@/lib/utils';

type FormMode = 'new' | 'log';

const MODE_OPTIONS: ReadonlyArray<SegmentedPillOption<FormMode>> = [
  { value: 'new', label: 'New Work Order', tone: 'primary' },
  { value: 'log', label: 'Log Completed', tone: 'primary' },
];

const SERVICE_DATE_PRESETS: ReadonlyArray<{ label: string; daysAgo: number }> = [
  { label: 'Today', daysAgo: 0 },
  { label: 'Yesterday', daysAgo: 1 },
];

const CREATE_ANOTHER_STORAGE_KEY = 'equipqr:work-order-form:create-another';

function readCreateAnotherPreference(): boolean {
  try {
    return window.localStorage.getItem(CREATE_ANOTHER_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

function writeCreateAnotherPreference(value: boolean): void {
  try {
    window.localStorage.setItem(CREATE_ANOTHER_STORAGE_KEY, value ? '1' : '0');
  } catch {
    // Private mode / blocked storage: the switch still works for this session.
  }
}

interface PinnedFields {
  equipment: boolean;
  assignee: boolean;
  completedDate: boolean;
}

const NO_PINS: PinnedFields = { equipment: false, assignee: false, completedDate: false };

interface WorkOrderFormProps {
  open: boolean;
  onClose: () => void;
  equipmentId?: string;
  workOrder?: WorkOrder;
  onSubmit?: (data: WorkOrderFormData) => void;
  /** Open directly in Log Completed mode (admins only). */
  initialIsHistorical?: boolean;
  /** External loading state (e.g., from parent component's mutation) */
  isUpdating?: boolean;
  /** PM data for edit mode to default template selection */
  pmData?: { template_id?: string | null } | null;
  prefillDueDate?: string | null;
  prefillHasTime?: boolean;
  /** Create mode only: starting title / description / priority (e.g. PM follow-up). */
  prefillTitle?: string;
  prefillDescription?: string;
  prefillPriority?: WorkOrderPriority;
  stayOnList?: boolean;
  onCreated?: (workOrderId: string) => void;
}

const WorkOrderForm: React.FC<WorkOrderFormProps> = ({
  open,
  onClose,
  equipmentId,
  workOrder,
  onSubmit,
  initialIsHistorical = false,
  isUpdating = false,
  pmData,
  prefillDueDate,
  prefillHasTime = false,
  prefillTitle,
  prefillDescription,
  prefillPriority,
  stayOnList = false,
  onCreated,
}) => {
  const { currentOrganization } = useOrganization();
  const { getUserTeamIds } = useSession();
  const { equipment: equipmentPerms } = useUnifiedPermissions();
  const { canManageOrganization } = usePermissions();
  // Logging completed work writes historical records, which the database limits to admins.
  const canLogCompleted = canManageOrganization();

  const [creationImages, setCreationImages] = useState<File[]>([]);
  const [createAnother, setCreateAnother] = useState<boolean>(readCreateAnotherPreference);
  const [pinned, setPinned] = useState<PinnedFields>(NO_PINS);
  const [selectedPmTemplate, setSelectedPmTemplate] = useState<PMTemplateSummary | null>(null);
  const [pmTurnOnSignal, setPmTurnOnSignal] = useState(0);
  const dialogContentRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const lastSubmittedRef = useRef<WorkOrderFormData | null>(null);

  // Get user's teams and filter to those they can create equipment for
  const userTeamIds = getUserTeamIds();
  const canCreateEquipment = useMemo(() => {
    return userTeamIds.some(teamId => equipmentPerms.canCreateForTeam(teamId));
  }, [userTeamIds, equipmentPerms]);

  const { form, isEditMode, checkForUnsavedChanges, resetForNext } = useWorkOrderForm({
    workOrder,
    equipmentId,
    isOpen: open,
    initialIsHistorical: initialIsHistorical && canLogCompleted,
    pmData,
    prefillDueDate,
    prefillHasTime,
    prefillTitle,
    prefillDescription,
    prefillPriority,
  });

  const { allEquipment, preSelectedEquipment, isEquipmentPreSelected } = useEquipmentSelection({
    equipmentId,
    workOrder
  });

  const isLogMode = !isEditMode && Boolean(form.values.isHistorical);
  const mode: FormMode = isLogMode ? 'log' : 'new';
  const isRapidEntry = !isEditMode && createAnother;

  // Currently selected equipment, for the PM default template and the hours reference.
  const selectedEquipment = useMemo(() => {
    const equipmentIdFromForm = form.values.equipmentId;
    if (!equipmentIdFromForm) return undefined;

    const equipmentFromList = allEquipment.find(eq => eq.id === equipmentIdFromForm);
    if (equipmentFromList) {
      return {
        id: equipmentFromList.id,
        name: equipmentFromList.name || '',
        default_pm_template_id: equipmentFromList.default_pm_template_id || null,
        working_hours: equipmentFromList.working_hours ?? null,
      };
    }

    if (preSelectedEquipment && preSelectedEquipment.id === equipmentIdFromForm) {
      return {
        id: preSelectedEquipment.id || '',
        name: preSelectedEquipment.name || '',
        default_pm_template_id: preSelectedEquipment.default_pm_template_id || null,
        working_hours: preSelectedEquipment.working_hours ?? null,
      };
    }

    return undefined;
  }, [form.values.equipmentId, allEquipment, preSelectedEquipment]);

  const logChecklist = useLogCompletedChecklist({
    enabled: isLogMode && Boolean(form.values.hasPM),
    templateId: form.values.pmTemplateId,
  });

  const focusTitle = useCallback(() => {
    // After a reset the input re-renders; wait a frame so focus lands on the fresh value.
    window.requestAnimationFrame(() => titleInputRef.current?.focus());
  }, []);

  const closeAndReset = () => {
    form.reset();
    setCreationImages([]);
    setPinned(NO_PINS);
    onClose();
  };

  const handleSubmitted = () => {
    const submitted = lastSubmittedRef.current;
    if (!isRapidEntry || !submitted) {
      closeAndReset();
      return;
    }

    // Rapid entry: keep the mode and pinned fields, clear the per-record ones.
    const keepEquipment = pinned.equipment || Boolean(equipmentId);
    const carryOver: Partial<WorkOrderFormData> = {
      equipmentId: keepEquipment ? submitted.equipmentId : '',
      assigneeId: pinned.assignee ? submitted.assigneeId ?? null : null,
      hasPM: submitted.hasPM,
      pmTemplateId: submitted.pmTemplateId ?? null,
    };
    if (submitted.isHistorical) {
      const nextServiceDate =
        pinned.completedDate && submitted.completedDate ? submitted.completedDate : todayServiceDate();
      carryOver.isHistorical = true;
      carryOver.status = 'completed';
      carryOver.completedDate = nextServiceDate;
      carryOver.historicalStartDate = nextServiceDate;
    }

    resetForNext(carryOver);
    setCreationImages([]);
    logChecklist.reset();
    focusTitle();
  };

  const { submitForm, isLoading } = useWorkOrderSubmission({
    workOrder,
    onSubmit,
    creationImages,
    keepOpen: isRapidEntry || stayOnList,
    rapidEntry: isRapidEntry,
    // In rapid entry the dialog stays put, so the caller is not asked to move on.
    onCreated: isRapidEntry ? undefined : onCreated,
    getHistoricalChecklist: logChecklist.getItems,
    onSuccess: handleSubmitted,
  });

  const isSubmitting = isLoading || isUpdating;

  const handleSubmit = async () => {
    if (isSubmitting) return;
    await form.handleSubmit(async (values) => {
      lastSubmittedRef.current = values;
      await submitForm(values);
    });
  };

  const handleClose = () => {
    if (checkForUnsavedChanges()) {
      const confirmClose = window.confirm('You have unsaved changes. Are you sure you want to close?');
      if (!confirmClose) return;
    }
    closeAndReset();
  };

  const handleModeChange = (nextMode: FormMode) => {
    if (nextMode === mode) return;
    if (nextMode === 'log') {
      const today = todayServiceDate();
      form.setValue('isHistorical', true);
      form.setValue('status', 'completed');
      form.setValue('completedDate', today);
      form.setValue('historicalStartDate', today);
      form.setValue('dueDate', undefined);
      form.setValue('dueDateHasTime', false);
      form.setValue('estimatedHours', undefined);
    } else {
      form.setValue('isHistorical', false);
      form.setValue('status', undefined);
      form.setValue('completedDate', undefined);
      form.setValue('historicalStartDate', undefined);
    }
    // Both modes reuse this field for different things; never carry a reading across.
    form.setValue('equipmentWorkingHours', undefined);
    form.setValue('quickBooksSyncReady', false);
    focusTitle();
  };

  const setServiceDate = (date: Date | null) => {
    form.setValue('completedDate', date ?? undefined);
    form.setValue('historicalStartDate', date ?? undefined);
  };

  const handleSymptomChip = (chip: WorkOrderSymptomChip) => {
    form.setValue('title', applySymptomChipToTitle(form.values.title || '', chip));
    if (chip === 'Preventative Maintenance' && !isEditMode) {
      // Goes through the PM toggle so it is treated as an explicit choice.
      setPmTurnOnSignal((signal) => signal + 1);
    }
    focusTitle();
  };

  const handleCreateAnotherChange = (checked: boolean) => {
    setCreateAnother(checked);
    writeCreateAnotherPreference(checked);
    if (!checked) setPinned(NO_PINS);
  };

  // Cmd/Ctrl+Enter saves from anywhere in the dialog. Listening on the window
  // (instead of the dialog element) keeps it working when focus has dropped to
  // the page body, e.g. right after the equipment picker closes.
  const submitRef = useRef(handleSubmit);
  submitRef.current = handleSubmit;
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Enter' || !(event.metaKey || event.ctrlKey) || event.defaultPrevented) return;
      const target = event.target as Node | null;
      const insideThisDialog = !!target && !!dialogContentRef.current?.contains(target);
      // Keys typed inside another open dialog (equipment picker) belong to that dialog.
      const insideAnotherDialog =
        !insideThisDialog && target instanceof Element && target.closest('[role="dialog"], [role="alertdialog"]') !== null;
      if (insideAnotherDialog) return;
      event.preventDefault();
      void submitRef.current();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  // Rapid entry starts every record from the title.
  useEffect(() => {
    if (open) focusTitle();
  }, [open, focusTitle]);

  const setPmValue = useCallback(
    (field: 'hasPM' | 'pmTemplateId', value: boolean | string | null | undefined) => {
      if (field === 'hasPM') {
        form.setValue('hasPM', Boolean(value));
      } else {
        form.setValue('pmTemplateId', typeof value === 'string' ? value : null);
      }
    },
    // form.setValue is stable; depending on `form` would rebuild this every keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [form.setValue],
  );

  const pmValues = useMemo(
    () => ({ hasPM: form.values.hasPM || false, pmTemplateId: form.values.pmTemplateId }),
    [form.values.hasPM, form.values.pmTemplateId],
  );

  const serviceDateValue = serviceDateInputValue(form.values.completedDate);
  const enteredServiceHours = form.values.equipmentWorkingHours;
  const currentEquipmentHours = selectedEquipment?.working_hours ?? null;
  const serviceHoursBelowCurrent =
    enteredServiceHours != null &&
    currentEquipmentHours != null &&
    enteredServiceHours <= currentEquipmentHours;

  const titleFieldId = 'work-order-title';
  const descriptionFieldId = 'work-order-description';
  const submitLabel = isEditMode
    ? isSubmitting ? 'Updating...' : 'Update Work Order'
    : isLogMode
      ? isSubmitting ? 'Saving...' : 'Log Completed Work Order'
      : isSubmitting ? 'Creating...' : 'Create Work Order';

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        ref={dialogContentRef}
        className="flex max-h-[calc(100dvh-2rem)] max-w-3xl flex-col gap-0 overflow-hidden p-0"
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          titleInputRef.current?.focus();
        }}
      >
        <div className="shrink-0 space-y-3 border-b px-4 pb-3 pt-5 sm:px-6">
          <WorkOrderFormHeader
            isEditMode={isEditMode}
            isLogMode={isLogMode}
            preSelectedEquipment={preSelectedEquipment}
          />
          {!isEditMode && canLogCompleted ? (
            <SegmentedPills
              ariaLabel="Work order entry mode"
              value={mode}
              onValueChange={handleModeChange}
              options={MODE_OPTIONS}
              fullWidth
              className="sm:inline-flex sm:w-auto"
            />
          ) : null}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <div className="grid grid-cols-1 md:grid-cols-[minmax(0,13fr)_minmax(0,7fr)]">
            {/* Left column: what the work is */}
            <div className="space-y-4 px-4 py-4 sm:px-6">
              <div className="space-y-2">
                <Label htmlFor={titleFieldId}>Title *</Label>
                <Input
                  ref={titleInputRef}
                  id={titleFieldId}
                  autoComplete="off"
                  placeholder={
                    preSelectedEquipment
                      ? `Maintenance for ${preSelectedEquipment.name}`
                      : 'Brief description of the work'
                  }
                  value={form.values.title || ''}
                  onChange={(e) => form.setValue('title', e.target.value)}
                />
                <WorkOrderSymptomChips
                  title={form.values.title || ''}
                  onSelect={handleSymptomChip}
                  disabled={isSubmitting}
                />
                {form.errors.title && (
                  <p className="text-sm text-destructive">{form.errors.title}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor={descriptionFieldId}>Description</Label>
                <Textarea
                  id={descriptionFieldId}
                  placeholder={
                    isLogMode
                      ? 'What was done, parts used, anything noted on the sheet...'
                      : 'Details, safety considerations, special instructions...'
                  }
                  className="min-h-24"
                  value={form.values.description || ''}
                  onChange={(e) => form.setValue('description', e.target.value)}
                />
                {form.errors.description && (
                  <p className="text-sm text-destructive">{form.errors.description}</p>
                )}
              </div>

              {isEditMode ? (
                <WorkOrderPMChecklist
                  key={`pm-${open}-${form.values.equipmentId || 'none'}`}
                  values={pmValues}
                  setValue={setPmValue}
                  selectedEquipment={selectedEquipment}
                  allowTemplateOverride
                />
              ) : (
                <WorkOrderAttachmentDropzone
                  images={creationImages}
                  onImagesChange={setCreationImages}
                  disabled={isSubmitting}
                  label={isLogMode ? 'Attach Paper Sheet / Photo' : 'Attach Photo'}
                  captureDocumentPaste={open}
                />
              )}

              {!isEditMode && form.values.hasPM ? (
                isLogMode ? (
                  <LogCompletedPMChecklist
                    items={logChecklist.items}
                    isLoading={logChecklist.isLoading}
                    exceptionCount={logChecklist.exceptionCount}
                    onConditionChange={logChecklist.setCondition}
                    onNotesChange={logChecklist.setNotes}
                  />
                ) : (
                  <div className="rounded-lg border bg-muted/30 px-3 py-2">
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                      <span className="font-medium">PM Checklist Preview</span>
                      <span className="text-xs text-muted-foreground">
                        {selectedPmTemplate
                          ? `${selectedPmTemplate.name} · ${selectedPmTemplate.itemCount} items`
                          : 'Standard forklift checklist'}
                      </span>
                    </div>
                    {selectedPmTemplate && selectedPmTemplate.sections.length > 0 ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {selectedPmTemplate.sections
                          .map((section) => `${section.name} (${section.count})`)
                          .join(' · ')}
                      </p>
                    ) : null}
                    <p className="mt-1 text-xs text-muted-foreground">
                      The checklist must be completed before this work order can be finished.
                    </p>
                  </div>
                )
              ) : null}

              {form.errors.general && (
                <Alert variant="destructive">
                  <AlertDescription>{form.errors.general}</AlertDescription>
                </Alert>
              )}
            </div>

            {/* Right column: which machine, who, when */}
            <div className="space-y-4 border-t bg-muted/30 px-4 py-4 md:border-l md:border-t-0">
              <WorkOrderEquipmentSelector
                values={form.values}
                errors={form.errors}
                setValue={form.setValue}
                preSelectedEquipment={
                  preSelectedEquipment
                    ? toEquipmentSelectorItem(preSelectedEquipment)
                    : undefined
                }
                allEquipment={allEquipment}
                isEditMode={isEditMode}
                isEquipmentPreSelected={isEquipmentPreSelected}
                canCreateEquipment={canCreateEquipment}
                canCreateEquipmentForTeam={equipmentPerms.canCreateForTeam}
                onEquipmentCreated={(newEquipmentId) => {
                  form.setValue('equipmentId', newEquipmentId);
                }}
                hideWorkingHours={isLogMode}
                labelAction={
                  isRapidEntry ? (
                    <WorkOrderPinToggle
                      field="Equipment"
                      pinned={pinned.equipment}
                      onPinnedChange={(value) => setPinned((prev) => ({ ...prev, equipment: value }))}
                    />
                  ) : undefined
                }
              />

              <div className="space-y-2">
                <Label id="work-order-priority-label">Priority</Label>
                <WorkOrderPriorityPills
                  value={form.values.priority || 'medium'}
                  onChange={(priority) => form.setValue('priority', priority)}
                />
                {form.errors.priority && (
                  <p className="text-sm text-destructive">{form.errors.priority}</p>
                )}
              </div>

              {(
                <WorkOrderAssignment
                  values={{ assigneeId: form.values.assigneeId }}
                  errors={{ assigneeId: form.errors.assigneeId }}
                  setValue={form.setValue}
                  organizationId={currentOrganization?.id || ''}
                  equipmentId={form.values.equipmentId || undefined}
                  label={isLogMode ? 'Performed by' : 'Assignee'}
                  hint={
                    isLogMode && !form.values.assigneeId
                      ? 'Left unassigned, the record is filed under your name.'
                      : undefined
                  }
                  labelAction={
                    isRapidEntry ? (
                      <WorkOrderPinToggle
                        field={isLogMode ? 'Performed by' : 'Assignee'}
                        pinned={pinned.assignee}
                        onPinnedChange={(value) => setPinned((prev) => ({ ...prev, assignee: value }))}
                      />
                    ) : undefined
                  }
                />
              )}

              {isLogMode ? (
                <>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <Label htmlFor="work-order-service-date">Completed / Service Date *</Label>
                      {isRapidEntry ? (
                        <WorkOrderPinToggle
                          field="Completed Date"
                          pinned={pinned.completedDate}
                          onPinnedChange={(value) =>
                            setPinned((prev) => ({ ...prev, completedDate: value }))
                          }
                        />
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-1.5" role="group" aria-label="Service date presets">
                      {SERVICE_DATE_PRESETS.map((preset) => {
                        const presetDate = serviceDateDaysAgo(preset.daysAgo);
                        const isActive = serviceDateInputValue(presetDate) === serviceDateValue;
                        return (
                          <button
                            key={preset.label}
                            type="button"
                            aria-pressed={isActive}
                            onClick={() => setServiceDate(presetDate)}
                            className={cn(
                              'touch-manipulation rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
                              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
                              isActive
                                ? 'border-primary/40 bg-primary/10 text-primary'
                                : 'border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground',
                            )}
                          >
                            {preset.label}
                          </button>
                        );
                      })}
                    </div>
                    <Input
                      id="work-order-service-date"
                      type="date"
                      max={serviceDateInputValue(todayServiceDate())}
                      value={serviceDateValue}
                      onChange={(e) => setServiceDate(parseServiceDateInput(e.target.value))}
                    />
                    {form.errors.completedDate && (
                      <p className="text-sm text-destructive">{form.errors.completedDate}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="work-order-service-hours">Machine Hours at Service</Label>
                    <div className="relative">
                      <Input
                        id="work-order-service-hours"
                        type="text"
                        inputMode="decimal"
                        autoComplete="off"
                        placeholder="Optional"
                        className="pr-12"
                        value={enteredServiceHours != null ? String(enteredServiceHours) : ''}
                        onChange={(e) => {
                          const raw = e.target.value.trim();
                          if (raw === '') {
                            form.setValue('equipmentWorkingHours', null);
                            return;
                          }
                          const parsed = Number(raw);
                          if (Number.isFinite(parsed) && parsed >= 0) {
                            form.setValue('equipmentWorkingHours', parsed);
                          }
                        }}
                      />
                      <span
                        className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground"
                        aria-hidden
                      >
                        hrs
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {selectedEquipment
                        ? currentEquipmentHours != null
                          ? `Current: ${currentEquipmentHours.toLocaleString()} hrs.`
                          : 'No current hours recorded.'
                        : 'Choose equipment to see its current hours.'}
                      {serviceHoursBelowCurrent
                        ? ' This reading is logged to history only; current hours stay as they are.'
                        : ''}
                    </p>
                    {form.errors.equipmentWorkingHours && (
                      <p className="text-sm text-destructive">{form.errors.equipmentWorkingHours}</p>
                    )}
                  </div>
                </>
              ) : (
                <WorkOrderScheduling
                  values={{
                    dueDate: form.values.dueDate,
                    dueDateHasTime: form.values.dueDateHasTime ?? false,
                    estimatedHours: form.values.estimatedHours
                  }}
                  errors={{
                    dueDate: form.errors.dueDate,
                    estimatedHours: form.errors.estimatedHours
                  }}
                  setValue={form.setValue}
                />
              )}

              {!isEditMode && (
                <WorkOrderPMToggle
                  values={pmValues}
                  setValue={setPmValue}
                  selectedEquipment={selectedEquipment}
                  disabled={isSubmitting}
                  onSelectedTemplateChange={setSelectedPmTemplate}
                  turnOnSignal={pmTurnOnSignal}
                />
              )}

              {isLogMode && isQuickBooksEnabled() ? (
                <div className="space-y-1.5 rounded-lg border bg-background px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <Label htmlFor="work-order-quickbooks-sync" className="cursor-pointer text-sm">
                      Ready to sync / bill in QuickBooks
                    </Label>
                    <Switch
                      id="work-order-quickbooks-sync"
                      checked={Boolean(form.values.quickBooksSyncReady)}
                      onCheckedChange={(checked) => form.setValue('quickBooksSyncReady', checked)}
                      disabled={isSubmitting}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {form.values.quickBooksSyncReady
                      ? 'This job will appear in the unbilled queue and can be exported.'
                      : 'Historical Only / Do Not Sync: already billed, kept out of QuickBooks.'}
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 flex shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t bg-background/95 px-4 py-3 backdrop-blur sm:px-6">
          {!isEditMode ? (
            <div className="flex items-center gap-2">
              <Switch
                id="work-order-create-another"
                checked={createAnother}
                onCheckedChange={handleCreateAnotherChange}
              />
              <Label htmlFor="work-order-create-another" className="cursor-pointer text-sm">
                Create another
              </Label>
            </div>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            <span className="hidden text-xs text-muted-foreground md:inline" aria-hidden>
              Ctrl/⌘ + Enter to save
            </span>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void handleSubmit()}
              data-testid="submit-button"
              disabled={isSubmitting || !form.isValid}
            >
              {submitLabel}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WorkOrderForm;
