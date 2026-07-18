// fallow-ignore-file code-duplication
// Duplication rationale: Large PM checklist with repeated per-item render paths
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useFormatTimestamp } from '@/hooks/useFormatTimestamp';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, AlertTriangle, RefreshCw } from 'lucide-react';
import { PMChecklistItem, PreventativeMaintenance, defaultForkliftChecklist, type PMChecklistCondition } from '@/features/pm-templates/services/preventativeMaintenanceService';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAutoSave } from '@/hooks/useAutoSave';
import { useBrowserStorage } from '@/hooks/useBrowserStorage';
import { SaveStatus } from '@/components/ui/SaveStatus';
import { toast } from 'sonner';
import { useUpdatePM } from '@/features/pm-templates/hooks/usePMData';
import { useQueryClient } from '@tanstack/react-query';
import { workOrderRevertService } from '@/features/work-orders/services/workOrderRevertService';
import { WorkOrderData, EquipmentData, TeamMemberData, OrganizationData } from '@/features/work-orders/types/workOrderDetails';
import { invalidateWorkOrderCaches } from '@/features/work-orders/utils/invalidateWorkOrderQueries';
import { logger } from '@/utils/logger';
import { usePMTemplates } from '@/features/pm-templates/hooks/usePMTemplates';
import PMChecklistSections from '@/features/work-orders/components/PMChecklistSections';
import { PMChecklistDialogs } from '@/features/work-orders/components/PMChecklistDialogs';
import { PMChecklistFooter } from '@/features/work-orders/components/PMChecklistFooter';
import {
  buildInitialOpenSections,
  isPMChecklistItemComplete,
  parsePMChecklistData,
} from '@/features/work-orders/utils/pmChecklistInit';
import { isNegativePMCondition, PM_CONDITION_NOT_APPLICABLE } from '@/utils/pmChecklistHelpers';
import { preventiveMaintenance } from '@/lib/queryKeys';
import { useAuth } from '@/hooks/useAuth';

const TERMINAL_WORK_ORDER_STATUSES = new Set(['completed', 'cancelled']);

// ============================================
// Pure utility functions (hoisted to module scope)
// ============================================

function getChecklistTitle(
  templateName: string | null | undefined,
  templateId: string | null | undefined,
): string {
  if (templateName) {
    return `${templateName} - Preventative Maintenance Checklist`;
  }
  if (templateId) {
    return 'Preventative Maintenance Checklist';
  }
  return 'Forklift Preventative Maintenance Checklist';
}

type PMChecklistStatusHeaderProps = {
  statusIcon: React.ReactNode;
  title: string;
  statusLabel: string;
  statusColorClass: string;
  titleClassName?: string;
  badgeRowExtras?: React.ReactNode;
};

function PMChecklistStatusHeader({
  statusIcon,
  title,
  statusLabel,
  statusColorClass,
  titleClassName,
  badgeRowExtras,
}: PMChecklistStatusHeaderProps) {
  return (
    <>
      {statusIcon}
      <div>
        <CardTitle className={titleClassName}>{title}</CardTitle>
        <div className="flex items-center gap-2 mt-1">
          <Badge className={statusColorClass}>{statusLabel}</Badge>
          {badgeRowExtras}
        </div>
      </div>
    </>
  );
}

// ============================================
// Main Component
// ============================================

interface PMChecklistComponentProps {
  pm: PreventativeMaintenance;
  onUpdate: () => void;
  readOnly?: boolean;
  isAdmin?: boolean;
  workOrder?: WorkOrderData;
  equipment?: EquipmentData;
  team?: TeamMemberData;
  organization?: OrganizationData;
  assignee?: TeamMemberData;
}

const PMChecklistComponent: React.FC<PMChecklistComponentProps> = ({
  pm,
  onUpdate,
  readOnly = false,
  isAdmin = false,
  workOrder,
  equipment,
  organization,
}) => {
  const { formatDateTime } = useFormatTimestamp();

  const isMobile = useIsMobile();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const updatePMMutation = useUpdatePM();
  const { data: allTemplates = [] } = usePMTemplates();
  
  // Find the template name if template_id exists
  const templateName = pm.template_id 
    ? allTemplates.find(t => t.id === pm.template_id)?.name 
    : null;
  const [checklist, setChecklist] = useState<PMChecklistItem[]>([]);
  const [notes, setNotes] = useState(pm.notes || '');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isReverting, setIsReverting] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const [expandedNotes, setExpandedNotes] = useState<Record<string, boolean>>({});
  // Track items that user has manually collapsed (to respect their preference over auto-expand)
  const [manuallyCollapsed, setManuallyCollapsed] = useState<Record<string, boolean>>({});
  const [isInitialized, setIsInitialized] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saving' | 'saved' | 'error' | 'offline'>('saved');
  const [lastSaved, setLastSaved] = useState<Date>();
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showSetAllOKDialog, setShowSetAllOKDialog] = useState(false);
  const [isSettingAllOK, setIsSettingAllOK] = useState(false);
  const [showRevertPMDialog, setShowRevertPMDialog] = useState(false);
  const [isManuallyUpdated, setIsManuallyUpdated] = useState(false);
  
  // Track the current template ID to detect template changes
  const lastTemplateIdRef = useRef<string | null | undefined>(pm.template_id);
  const lastPmIdRef = useRef<string>(pm.id);

  // Use ref to always have access to latest checklist state in callbacks
  const checklistRef = useRef(checklist);
  const notesRef = useRef(notes);

  // Keep refs in sync with state
  useEffect(() => {
    checklistRef.current = checklist;
  }, [checklist]);

  useEffect(() => {
    notesRef.current = notes;
  }, [notes]);

  // Browser storage for backup
  const storageKey = `pm-checklist-${pm.id}`;
  const { clearStorage } = useBrowserStorage({
    key: storageKey,
    data: { checklist, notes },
    enabled: !readOnly
  });

  // Auto-save functionality
  const handleAutoSave = useCallback(async () => {
    if (readOnly) return;
    
    // Use refs to get the latest values
    const currentChecklist = checklistRef.current;
    const currentNotes = notesRef.current;
    
    try {
      setSaveStatus('saving');
      const result = await updatePMMutation.mutateAsync({
        pmId: pm.id,
        data: {
          checklistData: currentChecklist,
          notes: currentNotes,
          status: pm.status === 'pending' ? 'in_progress' as const : pm.status as 'pending' | 'in_progress' | 'completed' | 'cancelled'
        },
        // Capture the server timestamp at edit time so the offline-sync
        // processor can detect a server-side change while we were offline.
        serverUpdatedAt: pm.updated_at,
      });

      if (result) {
        setSaveStatus('saved');
        setLastSaved(new Date());
        setHasUnsavedChanges(false);
        clearStorage(); // Clear backup after successful save

        // Refresh the component to show the updated data
        onUpdate();
      } else if (result === null) {
        // Queued offline — surface the saved state without dropping unsaved
        // markers (they continue to live in `useBrowserStorage`).
        setSaveStatus('saved');
        setLastSaved(new Date());
        setHasUnsavedChanges(false);
      } else {
        setSaveStatus('error');
      }
    } catch (error) {
      setSaveStatus('error');
      logger.error('Auto-save failed', error);
    }
  }, [pm.id, pm.status, pm.updated_at, readOnly, clearStorage, updatePMMutation, onUpdate]);

  const { triggerAutoSave, cancelAutoSave } = useAutoSave({
    onSave: handleAutoSave,
    selectionDelay: 3000,
    enabled: !readOnly
  });

  // Reset initialization when PM record changes (different PM ID or template changed)
  useEffect(() => {
    const templateChanged = String(lastTemplateIdRef.current) !== String(pm.template_id);
    const pmIdChanged = lastPmIdRef.current !== pm.id;
    
    if (templateChanged || pmIdChanged) {
      // Template or PM changed - reset initialization to reload checklist
      setIsInitialized(false);
      setIsManuallyUpdated(false);
      lastTemplateIdRef.current = pm.template_id;
      lastPmIdRef.current = pm.id;
    }
  }, [pm.template_id, pm.id]);

  useEffect(() => {
    // Only initialize once to prevent unnecessary resets
    // Also skip if we have manual updates to prevent overwriting user changes
    if (isInitialized || isManuallyUpdated) return;

    // Initialize PM Checklist

    try {
      const { checklist: parsedChecklist, notes: storedNotes, fromStorage } = parsePMChecklistData(
        pm.checklist_data,
        storageKey,
      );

      if (fromStorage) {
        setNotes(storedNotes);
      }

      setChecklist(parsedChecklist);
      setOpenSections(buildInitialOpenSections(parsedChecklist));
      setIsInitialized(true);
    } catch (error) {
      logger.error('Error parsing checklist data', error);
      setChecklist([...defaultForkliftChecklist]);
      setOpenSections(buildInitialOpenSections(defaultForkliftChecklist));
      setIsInitialized(true);
    }
  }, [pm.checklist_data, pm.id, isMobile, isInitialized, isManuallyUpdated, storageKey]);

  const handleInitializeChecklist = useCallback(async () => {
    try {
      setIsUpdating(true);
      const updatedPM = await updatePMMutation.mutateAsync({
        pmId: pm.id,
        data: {
          checklistData: defaultForkliftChecklist,
          notes: notes || 'PM checklist initialized with default forklift maintenance items.',
          status: pm.status === 'pending' ? 'in_progress' as const : pm.status as 'pending' | 'in_progress' | 'completed' | 'cancelled'
        },
        serverUpdatedAt: pm.updated_at,
      });

      if (updatedPM === null) {
        // Queued offline
        setChecklist([...defaultForkliftChecklist]);
        setHasUnsavedChanges(false);
      } else if (updatedPM) {
        toast.success('Checklist initialized successfully');
        setChecklist([...defaultForkliftChecklist]);
        setHasUnsavedChanges(false);
        clearStorage();
        // Don't call onUpdate() - the mutation hook already handles cache updates
      } else {
        toast.error('Failed to initialize checklist');
      }
    } catch (error) {
      logger.error('Error initializing checklist', error);
      toast.error('Failed to initialize checklist');
    } finally {
      setIsUpdating(false);
    }
  }, [pm.id, notes, pm.status, pm.updated_at, clearStorage, updatePMMutation]);

  const handleChecklistItemChange = useCallback((itemId: string, condition: PMChecklistCondition) => {
    setChecklist(prev => prev.map(item => 
      item.id === itemId 
        ? { ...item, condition } 
        : item
    ));
    setHasUnsavedChanges(true);
    triggerAutoSave('selection'); // Use selection trigger for immediate UI changes
    
    // Auto-expand notes for negative conditions (2-5)
    // Clear manual collapse state to re-enable auto-expand on condition change
    if (isNegativePMCondition(condition)) {
      setManuallyCollapsed(prev => {
        const updated = { ...prev };
        delete updated[itemId];
        return updated;
      });
      setExpandedNotes(prev => ({ ...prev, [itemId]: true }));
    } else {
      // When switching back to OK (condition 1), collapse notes if there are no existing notes
      const item = checklist.find(checklistItem => checklistItem.id === itemId);
      const hasExistingNotes = !!item?.notes?.trim();

      if (!hasExistingNotes) {
        setExpandedNotes(prev => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { [itemId]: _, ...rest } = prev;
          return rest;
        });
      }
    }
  }, [checklist, triggerAutoSave]);

  const handleNotesItemChange = useCallback((itemId: string, notes: string) => {
    setChecklist(prev => prev.map(item => 
      item.id === itemId 
        ? { ...item, notes } 
        : item
    ));
    setHasUnsavedChanges(true);
    triggerAutoSave('text'); // Use text trigger for longer debounce
  }, [triggerAutoSave]);

  // isItemComplete is hoisted to module scope above

  const saveChanges = useCallback(async () => {
    setIsUpdating(true);
    cancelAutoSave(); // Cancel any pending auto-save
    
    // Use refs to get the latest values
    const currentChecklist = checklistRef.current;
    const currentNotes = notesRef.current;
    
    try {
      setSaveStatus('saving');
      const updatedPM = await updatePMMutation.mutateAsync({
        pmId: pm.id,
        data: {
          checklistData: currentChecklist,
          notes: currentNotes,
          status: pm.status === 'pending' ? 'in_progress' as const : pm.status as 'pending' | 'in_progress' | 'completed' | 'cancelled'
        },
        serverUpdatedAt: pm.updated_at,
      });

      if (updatedPM === null) {
        // Queued offline — pending sync banner reflects the state.
        setSaveStatus('saved');
        setLastSaved(new Date());
        setHasUnsavedChanges(false);
      } else if (updatedPM) {
        toast.success('PM checklist updated successfully');
        setSaveStatus('saved');
        setLastSaved(new Date());
        setHasUnsavedChanges(false);
        clearStorage();
        // Refresh the component to show the updated data
        onUpdate();
      } else {
        setSaveStatus('error');
        toast.error('Failed to update PM checklist');
      }
    } catch (error) {
      logger.error('Error updating PM', error);
      setSaveStatus('error');
      toast.error('Failed to update PM checklist');
    } finally {
      setIsUpdating(false);
    }
  }, [pm.id, pm.status, pm.updated_at, cancelAutoSave, clearStorage, updatePMMutation, onUpdate]);

  const completePM = async () => {
    const requiredItems = checklist.filter(item => item.required);
    const unratedRequiredItems = requiredItems.filter(item => !isPMChecklistItemComplete(item));
    const unsafeItems = checklist.filter(item => item.condition === 5);

    if (unratedRequiredItems.length > 0) {
      toast.error(`Please rate all required items before completing: ${unratedRequiredItems.map(item => item.title).join(', ')}`);
      return;
    }

    if (unsafeItems.length > 0) {
      toast.error(`Address unsafe conditions before completing: ${unsafeItems.map(item => item.title).join(', ')}`);
      return;
    }

    setIsUpdating(true);
    try {
      const updatedPM = await updatePMMutation.mutateAsync({
        pmId: pm.id,
        data: {
          checklistData: checklist,
          notes,
          status: 'completed' as const,
          completedAt: new Date().toISOString(),
          completedBy: user?.id,
        },
        serverUpdatedAt: pm.updated_at,
      });

      if (updatedPM === null) {
        // usePMData's onSuccess already fires the offline toast; no second toast here.
        const orgId = organization?.id;
        if (orgId && workOrder?.id) {
          const queryKey = preventiveMaintenance.byWorkOrderAndEquipment(
            workOrder.id,
            equipment?.id || pm.equipment_id,
            orgId,
          );
          const completedAt = new Date().toISOString();
          queryClient.setQueryData(queryKey, (prev: PreventativeMaintenance | undefined) => {
            if (!prev) return prev;
            return {
              ...prev,
              status: 'completed',
              completed_at: completedAt,
              completed_by: user?.id ?? null,
              checklist_data: checklist as unknown as typeof prev.checklist_data,
              notes,
            };
          });
        }
        setIsManuallyUpdated(false);
        onUpdate();
      } else if (updatedPM) {
        toast.success('PM completed successfully');
        // Don't call onUpdate() - the mutation hook already handles cache updates
      } else {
        toast.error('Failed to complete PM');
      }
    } catch (error) {
      logger.error('Error completing PM', error);
      toast.error('Failed to complete PM');
    } finally {
      setIsUpdating(false);
    }
  };

  const workOrderId = workOrder?.id || pm.work_order_id;
  const willReopenWorkOrder =
    !!workOrderId && TERMINAL_WORK_ORDER_STATUSES.has(workOrder?.status ?? '');

  const revertPMCompletion = async () => {
    setIsReverting(true);
    try {
      const result = await workOrderRevertService.revertPMCompletion(pm.id, {
        reason: 'PM completion reverted by admin',
        workOrderId,
        workOrderStatus: workOrder?.status,
      });

      const orgId = organization?.id || workOrder?.organization_id;
      if (workOrderId) {
        queryClient.invalidateQueries({ queryKey: preventiveMaintenance.byWorkOrder(workOrderId) });
      }
      if (orgId && workOrderId) {
        invalidateWorkOrderCaches(queryClient, orgId, workOrderId);
      }

      if (result.success) {
        if (result.work_order_reopened) {
          toast.success(
            `PM reverted to ${result.new_status} and work order reopened to ${result.work_order_new_status ?? 'accepted'}`,
          );
        } else {
          toast.success(`PM status reverted from ${result.old_status} to ${result.new_status}`);
        }
        onUpdate();
      } else {
        // PM may already be pending when WO reopen fails — still refresh caches above.
        toast.error(result.error || 'Failed to revert PM completion');
        onUpdate();
      }
    } catch (error) {
      logger.error('Error reverting PM completion', error);
      toast.error('Failed to revert PM completion');
    } finally {
      setIsReverting(false);
    }
  };

  const handleSetAllToOK = useCallback(async () => {
    setIsSettingAllOK(true);
    try {
      const updatedChecklist = checklist.map(item => ({
        ...item,
        condition: 1 as const // Set to "OK" while preserving notes and other properties
      }));
      
      // Optimistically update local state
      setChecklist(updatedChecklist);
      setIsManuallyUpdated(true);
      
      // Update cache optimistically
      const updatedPM = {
        ...pm,
        checklist_data: updatedChecklist as unknown as typeof pm.checklist_data,
        notes: notes
      };
      
      // Update query cache immediately with optimistic data
      // Require organization ID to be present; throw error if missing
      if (!organization?.id) {
        toast.error('Organization ID is required for updating PM checklist, but is missing.');
        setChecklist(checklist); // Rollback optimistic update
        setIsManuallyUpdated(false);
        setIsSettingAllOK(false);
        return;
      }
      const orgId = organization.id;
      const queryKey = preventiveMaintenance.byWorkOrderAndEquipment(
        workOrder?.id || pm.work_order_id,
        equipment?.id || pm.equipment_id,
        orgId
      );
      queryClient.setQueryData(queryKey, updatedPM);
      
      // Save to database using mutation hook
      
      const result = await updatePMMutation.mutateAsync({
        pmId: pm.id,
        data: {
          checklistData: updatedChecklist,
          notes: notes
        },
        serverUpdatedAt: pm.updated_at,
      });

      if (result === null) {
        // Queued offline — keep optimistic state.
        // usePMData's onSuccess fires the offline toast; no second toast here.
        setHasUnsavedChanges(false);
        localStorage.removeItem(storageKey);
        setShowSetAllOKDialog(false);
      } else if (result) {

        setHasUnsavedChanges(false);
        // Clear backup since we've saved successfully
        localStorage.removeItem(storageKey);

        toast.success('All items set to OK and PM saved successfully');
        setShowSetAllOKDialog(false);

        // Don't call onUpdate() - the mutation hook already handles cache updates
        // Calling it causes query invalidation that triggers re-initialization
        // onUpdate();
      } else {
        logger.error('PM update returned null - mutation may have failed');
        // Rollback on failure
        setChecklist(checklist);
        setIsManuallyUpdated(false);
        throw new Error('Failed to update PM');
      }
  } catch (error) {
    logger.error('Error setting all items to OK and saving', error);
      toast.error('Failed to set all items to OK and save PM');
      // Rollback optimistic update
      setChecklist(checklist);
      setIsManuallyUpdated(false);
    } finally {
      setIsSettingAllOK(false);
    }
  }, [checklist, notes, pm, updatePMMutation, storageKey, queryClient, workOrder, equipment, organization?.id]);

  const getStatusIcon = () => {
    switch (pm.status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-success" />;
      case 'in_progress':
        return <Clock className="h-5 w-5 text-info" />;
      case 'pending':
        return <AlertTriangle className="h-5 w-5 text-warning" />;
      default:
        return <Clock className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getStatusColor = () => {
    switch (pm.status) {
      case 'completed':
        return 'bg-success/20 text-success';
      case 'in_progress':
        return 'bg-info/20 text-info';
      case 'pending':
        return 'bg-warning/20 text-warning';
      default:
        return 'bg-muted text-foreground';
    }
  };

  const checklistTitle = getChecklistTitle(templateName, pm.template_id);
  const statusLabel = pm.status.replace('_', ' ').toUpperCase();

  // getConditionColor, getConditionText, and isItemComplete are hoisted to module scope

  // Memoize expensive calculations — single pass over the checklist array
  const { sections, completedItems, unratedRequiredItems, unsafeItems } = useMemo(() => {
    const sectionSet = new Set<string>();
    const completed: PMChecklistItem[] = [];
    const unratedRequired: PMChecklistItem[] = [];
    const unsafe: PMChecklistItem[] = [];

    for (const item of checklist) {
      sectionSet.add(item.section);
      if (isPMChecklistItemComplete(item)) {
        completed.push(item);
      }
      if (item.required && !isPMChecklistItemComplete(item)) {
        unratedRequired.push(item);
      }
      if (item.condition === 5) {
        unsafe.push(item);
      }
    }

    return {
      sections: Array.from(sectionSet),
      completedItems: completed,
      unratedRequiredItems: unratedRequired,
      unsafeItems: unsafe,
    };
  }, [checklist]);
  const totalItems = checklist.length;

  // Calculate section progress
  const getSectionProgress = useCallback((section: string) => {
    const sectionItems = checklist.filter(item => item.section === section);
    const completedSectionItems = sectionItems.filter(item => isPMChecklistItemComplete(item));
    return {
      completed: completedSectionItems.length,
      total: sectionItems.length,
      percentage: sectionItems.length > 0 ? (completedSectionItems.length / sectionItems.length) * 100 : 0
    };
  }, [checklist]);

  const toggleSection = useCallback((section: string) => {
    setOpenSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  }, []);

  const toggleNotesVisibility = useCallback((itemId: string) => {
    // Find the item to check its current visibility state
    const item = checklistRef.current.find(i => i.id === itemId);
    if (!item) return;
    
    // Determine current visibility using the same logic as shouldShowNotes
    const hasExistingNotes = item.notes && item.notes.trim() !== '';
    const isManuallyCollapsedNow = manuallyCollapsed[itemId];
    const isExplicitlyExpanded = expandedNotes[itemId];
    const hasNegativeCondition =
      item.condition !== null &&
      item.condition !== undefined &&
      isNegativePMCondition(item.condition);
    
    const isCurrentlyVisible = 
      hasExistingNotes || 
      (!isManuallyCollapsedNow && (isExplicitlyExpanded || hasNegativeCondition));
    
    if (isCurrentlyVisible) {
      // User is collapsing notes - track this preference
      setManuallyCollapsed(collapsed => ({ ...collapsed, [itemId]: true }));
      setExpandedNotes(prev => ({ ...prev, [itemId]: false }));
    } else {
      // User is expanding notes - clear manual collapse state
      setManuallyCollapsed(collapsed => {
        const updated = { ...collapsed };
        delete updated[itemId];
        return updated;
      });
      setExpandedNotes(prev => ({ ...prev, [itemId]: true }));
    }
  }, [expandedNotes, manuallyCollapsed]);

  // Helper to determine if notes should be shown for an item
  const shouldShowNotes = useCallback((item: PMChecklistItem) => {
    // Always show if notes exist
    if (item.notes && item.notes.trim() !== '') return true;
    
    // Respect user's manual collapse preference
    if (manuallyCollapsed[item.id]) return false;
    
    // Show if manually expanded
    if (expandedNotes[item.id]) return true;
    
    // Auto-expand for negative statuses (2-5) - only if not manually collapsed
    if (item.condition !== null && item.condition !== undefined && isNegativePMCondition(item.condition)) return true;
    
    return false;
  }, [expandedNotes, manuallyCollapsed]);

  // Helper function to get border styling based on item state
  const getItemBorderClass = useCallback((item: PMChecklistItem) => {
    const isComplete = isPMChecklistItemComplete(item);
    if (isComplete) {
      if (item.condition === PM_CONDITION_NOT_APPLICABLE) {
        return 'border-l-4 border-l-muted-foreground';
      }
      return 'border-l-4 border-l-success'; // Green border for completed items
    } else if (item.required) {
      return 'border-l-4 border-l-destructive'; // Red border for required unrated items
    }
    return ''; // No colored border for optional unrated items
  }, []);

  // Handle notes changes with auto-save for text input
  const handleNotesChange = useCallback((value: string) => {
    setNotes(value);
    setHasUnsavedChanges(true);
    triggerAutoSave('text'); // Use text trigger for longer debounce
  }, [triggerAutoSave]);

  // Show empty state if checklist is empty and not initialized
  if (checklist.length === 0 && !isInitialized) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <PMChecklistStatusHeader
                statusIcon={getStatusIcon()}
                title={checklistTitle}
                statusLabel={statusLabel}
                statusColorClass={getStatusColor()}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="h-32 bg-muted animate-pulse rounded" />
        </CardContent>
      </Card>
    );
  }

  // Show initialization option if checklist is empty but initialized
  if (checklist.length === 0 && isInitialized) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <PMChecklistStatusHeader
                statusIcon={getStatusIcon()}
                title={checklistTitle}
                statusLabel={statusLabel}
                statusColorClass={getStatusColor()}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              PM checklist is empty. Initialize it with the default forklift maintenance checklist.
            </AlertDescription>
          </Alert>
          {!readOnly && (
            <Button 
              onClick={handleInitializeChecklist}
              disabled={isUpdating}
              className="w-full"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              {isUpdating ? 'Initializing...' : 'Initialize Default Checklist'}
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-elevation-2">
      <CardHeader>
        {isMobile ? (
          // Mobile: Multi-row layout with stacked elements
          <div className="space-y-4">
            {/* Title Row */}
            <div className="flex items-center gap-3">
              {getStatusIcon()}
              <CardTitle className="text-lg leading-tight">{checklistTitle}</CardTitle>
            </div>
            
            {/* Status and Progress Row */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Badge className={getStatusColor()}>{statusLabel}</Badge>
                {hasUnsavedChanges && (
                  <Badge variant="outline" className="text-xs">Unsaved changes</Badge>
                )}
                {!readOnly && (
                  <SaveStatus 
                    status={saveStatus} 
                    lastSaved={lastSaved}
                  />
                )}
              </div>
              <span className="text-sm text-muted-foreground">
                Progress: {completedItems.length}/{totalItems} items completed
              </span>
            </div>
          </div>
        ) : (
          // Desktop: Horizontal layout
          <div className="flex items-center gap-3">
            <PMChecklistStatusHeader
              statusIcon={getStatusIcon()}
              title={checklistTitle}
              statusLabel={statusLabel}
              statusColorClass={getStatusColor()}
              badgeRowExtras={
                <>
                  {hasUnsavedChanges && (
                    <Badge variant="outline" className="text-xs">Unsaved changes</Badge>
                  )}
                  <span className="text-sm text-muted-foreground">
                    Progress: {completedItems.length}/{totalItems} items completed
                  </span>
                  {!readOnly && (
                    <SaveStatus
                      status={saveStatus}
                      lastSaved={lastSaved}
                      className="ml-2"
                    />
                  )}
                </>
              }
            />
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <PMChecklistSections
          sections={sections}
          checklist={checklist}
          openSections={openSections}
          readOnly={!!readOnly}
          pmStatus={pm.status}
          toggleSection={toggleSection}
          getSectionProgress={getSectionProgress}
          handleChecklistItemChange={handleChecklistItemChange}
          toggleNotesVisibility={toggleNotesVisibility}
          shouldShowNotes={shouldShowNotes}
          getItemBorderClass={getItemBorderClass}
          handleNotesItemChange={handleNotesItemChange}
        />

        <PMChecklistFooter
          pmStatus={pm.status}
          readOnly={readOnly}
          isAdmin={isAdmin}
          notes={notes}
          unratedRequiredItems={unratedRequiredItems}
          unsafeItems={unsafeItems}
          isUpdating={isUpdating}
          isReverting={isReverting}
          isSettingAllOK={isSettingAllOK}
          completedAt={pm.completed_at}
          formattedCompletedAt={pm.completed_at ? formatDateTime(pm.completed_at) : undefined}
          onNotesChange={handleNotesChange}
          onSaveChanges={saveChanges}
          onCompletePM={completePM}
          onShowSetAllOKDialog={() => setShowSetAllOKDialog(true)}
          onShowRevertPMDialog={() => setShowRevertPMDialog(true)}
        />

        <PMChecklistDialogs
          showSetAllOKDialog={showSetAllOKDialog}
          onSetAllOKDialogOpenChange={setShowSetAllOKDialog}
          isSettingAllOK={isSettingAllOK}
          onConfirmSetAllOK={handleSetAllToOK}
          showRevertPMDialog={showRevertPMDialog}
          onRevertPMDialogOpenChange={setShowRevertPMDialog}
          isReverting={isReverting}
          onConfirmRevert={revertPMCompletion}
          willReopenWorkOrder={willReopenWorkOrder}
        />
      </CardContent>
    </Card>
  );
};

export default PMChecklistComponent;

