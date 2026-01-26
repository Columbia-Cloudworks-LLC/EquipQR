import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { CheckCircle, Clock, AlertTriangle, ChevronDown, ChevronRight, RefreshCw, Circle, RotateCcw, MessageSquare, MessageSquareText } from 'lucide-react';

import { SegmentedProgress } from '@/components/ui/segmented-progress';
import { createSegmentsForSection } from '@/utils/pmChecklistHelpers';
import { PMChecklistItem, PreventativeMaintenance, defaultForkliftChecklist } from '@/features/pm-templates/services/preventativeMaintenanceService';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAutoSave } from '@/hooks/useAutoSave';
import { useBrowserStorage } from '@/hooks/useBrowserStorage';
import { SaveStatus } from '@/components/ui/SaveStatus';
import { toast } from 'sonner';
import { useUpdatePM } from '@/features/pm-templates/hooks/usePMData';
import { useQueryClient } from '@tanstack/react-query';
import { workOrderRevertService } from '@/features/work-orders/services/workOrderRevertService';
import { WorkOrderData, EquipmentData, TeamMemberData, OrganizationData } from '@/features/work-orders/types/workOrderDetails';
import { logger } from '@/utils/logger';
import { usePMTemplates } from '@/features/pm-templates/hooks/usePMTemplates';
import { cn } from '@/lib/utils';

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
  const isMobile = useIsMobile();
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
        }
      });
      
      if (result) {
        setSaveStatus('saved');
        setLastSaved(new Date());
        setHasUnsavedChanges(false);
        clearStorage(); // Clear backup after successful save
        
        // Refresh the component to show the updated data
        onUpdate();
      } else {
        setSaveStatus('error');
      }
    } catch (error) {
      setSaveStatus('error');
      logger.error('Auto-save failed', error);
    }
  }, [pm.id, pm.status, readOnly, clearStorage, updatePMMutation, onUpdate]);

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
      let parsedChecklist: PMChecklistItem[] = [];
      
      // Improved validation and parsing logic
      if (pm.checklist_data && Array.isArray(pm.checklist_data) && pm.checklist_data.length > 0) {
        // Validate that the array contains valid checklist items
        const isValidChecklistData = pm.checklist_data.every((item: unknown) => {
          const checklistItem = item as Record<string, unknown>;
          return (
            item &&
            typeof item === 'object' &&
            typeof checklistItem.id === 'string' &&
            typeof checklistItem.title === 'string' &&
            typeof checklistItem.section === 'string' &&
            typeof checklistItem.required === 'boolean' &&
            (checklistItem.condition === null || checklistItem.condition === undefined || 
             (typeof checklistItem.condition === 'number' && Number(checklistItem.condition) >= 1 && Number(checklistItem.condition) <= 5))
          );
        });

        if (isValidChecklistData) {
          // Cast the data with proper type assertion
          parsedChecklist = pm.checklist_data.map((item: unknown) => {
            const checklistItem = item as Record<string, unknown>;
            return {
              id: String(checklistItem.id),
              title: String(checklistItem.title),
              description: checklistItem.description ? String(checklistItem.description) : undefined,
              section: String(checklistItem.section),
              required: Boolean(checklistItem.required),
              condition: checklistItem.condition !== null && checklistItem.condition !== undefined ? Number(checklistItem.condition) as 1 | 2 | 3 | 4 | 5 : null,
              notes: checklistItem.notes ? String(checklistItem.notes) : undefined
            };
          });
          
          // Using saved checklist data
        } else {
          // Saved checklist data is invalid, using default
          parsedChecklist = [...defaultForkliftChecklist];
        }
      } else {
        // Try to load from browser storage first (only if PM data is empty)
        try {
          const stored = localStorage.getItem(storageKey);
          if (stored) {
            const parsed = JSON.parse(stored);
            if (Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000) {
              if (parsed.data.checklist && Array.isArray(parsed.data.checklist)) {
                parsedChecklist = parsed.data.checklist;
                setNotes(parsed.data.notes || '');
                // Loaded from browser storage
              }
            }
          }
        } catch (error) {
          logger.warn('Failed to load PM checklist from browser storage', error);
        }
        
        if (parsedChecklist.length === 0) {
          // Using default forklift checklist
          parsedChecklist = [...defaultForkliftChecklist];
        }
      }

      setChecklist(parsedChecklist);

      // Initialize all sections as collapsed by default
      const sections = Array.from(new Set(parsedChecklist.map(item => item.section)));
      const initialOpenSections: Record<string, boolean> = {};
      sections.forEach(section => {
        initialOpenSections[section] = false; // All sections collapsed by default
      });
      setOpenSections(initialOpenSections);
      
      setIsInitialized(true);
    } catch (error) {
      logger.error('Error parsing checklist data', error);
      setChecklist([...defaultForkliftChecklist]);
      
      // Initialize sections for default checklist (all collapsed)
      const sections = Array.from(new Set(defaultForkliftChecklist.map(item => item.section)));
      const initialOpenSections: Record<string, boolean> = {};
      sections.forEach(section => {
        initialOpenSections[section] = false; // All sections collapsed by default
      });
      setOpenSections(initialOpenSections);
      
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
        }
      });

      if (updatedPM) {
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
  }, [pm.id, notes, pm.status, clearStorage, updatePMMutation]);

  const handleChecklistItemChange = useCallback((itemId: string, condition: 1 | 2 | 3 | 4 | 5) => {
    setChecklist(prev => prev.map(item => 
      item.id === itemId 
        ? { ...item, condition } 
        : item
    ));
    setHasUnsavedChanges(true);
    triggerAutoSave('selection'); // Use selection trigger for immediate UI changes
    
    // Auto-expand notes for negative conditions (2-5)
    // Clear manual collapse state to re-enable auto-expand on condition change
    if (condition >= 2) {
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

  const isItemComplete = (item: PMChecklistItem): boolean => {
    return item.condition !== null && item.condition !== undefined;
  };

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
        }
      });

      if (updatedPM) {
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
  }, [pm.id, pm.status, cancelAutoSave, clearStorage, updatePMMutation, onUpdate]);

  const completePM = async () => {
    const requiredItems = checklist.filter(item => item.required);
    const unratedRequiredItems = requiredItems.filter(item => !isItemComplete(item));
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
          status: 'completed' as const
        }
      });

      if (updatedPM) {
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

  const revertPMCompletion = async () => {
    setIsReverting(true);
    try {
      const result = await workOrderRevertService.revertPMCompletion(
        pm.id,
        'PM completion reverted by admin'
      );
      
      if (result.success) {
        toast.success(`PM status reverted from ${result.old_status} to ${result.new_status}`);
        onUpdate();
      } else {
        toast.error(result.error || 'Failed to revert PM completion');
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
      const queryKey = ['preventativeMaintenance', workOrder?.id || pm.work_order_id, equipment?.id || pm.equipment_id, orgId];
      queryClient.setQueryData(queryKey, updatedPM);
      
      // Save to database using mutation hook
      
      const result = await updatePMMutation.mutateAsync({
        pmId: pm.id,
        data: {
          checklistData: updatedChecklist,
          notes: notes
        }
      });

      if (result) {
        
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
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'in_progress':
        return <Clock className="h-5 w-5 text-blue-600" />;
      case 'pending':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      default:
        return <Clock className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusColor = () => {
    switch (pm.status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getConditionColor = (condition: number | null | undefined) => {
    if (condition === null || condition === undefined) return 'text-red-600';
    switch (condition) {
      case 1:
        return 'text-green-600';
      case 2:
        return 'text-yellow-600';
      case 3:
        return 'text-orange-600';
      case 4:
        return 'text-red-600';
      case 5:
        return 'text-red-800';
      default:
        return 'text-gray-600';
    }
  };

  const getConditionText = (condition: number | null | undefined) => {
    if (condition === null || condition === undefined) return 'Not Rated';
    switch (condition) {
      case 1: return 'OK';
      case 2: return 'Adjusted';
      case 3: return 'Recommend Repairs';
      case 4: return 'Requires Immediate Repairs';
      case 5: return 'Unsafe Condition Present';
      default: return 'Unknown';
    }
  };

  // Memoize expensive calculations
  const sections = useMemo(() => Array.from(new Set(checklist.map(item => item.section))), [checklist]);
  const completedItems = useMemo(() => checklist.filter(item => isItemComplete(item)), [checklist]);
  const totalItems = checklist.length;
  const unratedRequiredItems = useMemo(() => checklist.filter(item => item.required && !isItemComplete(item)), [checklist]);
  const unsafeItems = useMemo(() => checklist.filter(item => item.condition === 5), [checklist]);

  // Calculate section progress
  const getSectionProgress = useCallback((section: string) => {
    const sectionItems = checklist.filter(item => item.section === section);
    const completedSectionItems = sectionItems.filter(item => isItemComplete(item));
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
    const hasNegativeCondition = item.condition !== null && item.condition >= 2;
    
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
    if (item.condition !== null && item.condition >= 2) return true;
    
    return false;
  }, [expandedNotes, manuallyCollapsed]);

  // Helper function to get border styling based on item state
  const getItemBorderClass = useCallback((item: PMChecklistItem) => {
    const isComplete = isItemComplete(item);
    if (isComplete) {
      return 'border-l-4 border-l-green-500'; // Green border for completed items
    } else if (item.required) {
      return 'border-l-4 border-l-red-500'; // Red border for required unrated items
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
              {getStatusIcon()}
              <div>
                <CardTitle>
                  {templateName 
                    ? `${templateName} - Preventative Maintenance Checklist`
                    : pm.template_id 
                      ? 'Preventative Maintenance Checklist' 
                      : 'Forklift Preventative Maintenance Checklist'
                  }
                </CardTitle>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className={getStatusColor()}>
                    {pm.status.replace('_', ' ').toUpperCase()}
                  </Badge>
                </div>
              </div>
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
              {getStatusIcon()}
              <div>
                <CardTitle>
                  {templateName 
                    ? `${templateName} - Preventative Maintenance Checklist`
                    : pm.template_id 
                      ? 'Preventative Maintenance Checklist' 
                      : 'Forklift Preventative Maintenance Checklist'
                  }
                </CardTitle>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className={getStatusColor()}>
                    {pm.status.replace('_', ' ').toUpperCase()}
                  </Badge>
                </div>
              </div>
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
              <CardTitle className="text-lg leading-tight">
                {templateName 
                  ? `${templateName} - Preventative Maintenance Checklist`
                  : pm.template_id 
                    ? 'Preventative Maintenance Checklist' 
                    : 'Forklift Preventative Maintenance Checklist'
                }
              </CardTitle>
            </div>
            
            {/* Status and Progress Row */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Badge className={getStatusColor()}>
                  {pm.status.replace('_', ' ').toUpperCase()}
                </Badge>
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
            {getStatusIcon()}
            <div>
              <CardTitle>
                {templateName 
                  ? `${templateName} - Preventative Maintenance Checklist`
                  : pm.template_id 
                    ? 'Preventative Maintenance Checklist' 
                    : 'Forklift Preventative Maintenance Checklist'
                }
              </CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge className={getStatusColor()}>
                  {pm.status.replace('_', ' ').toUpperCase()}
                </Badge>
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
              </div>
            </div>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {pm.status !== 'completed' && unratedRequiredItems.length > 0 && (
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-red-800">
              {unratedRequiredItems.length} required item(s) need to be rated before completion.
              {!readOnly && (
                <>
                  {' '}
                  <button 
                    onClick={() => setShowSetAllOKDialog(true)}
                    className="text-red-800 underline hover:no-underline focus:outline-none"
                    disabled={isSettingAllOK}
                  >
                    Set All to OK
                  </button>
                </>
              )}
            </AlertDescription>
          </Alert>
        )}

        {pm.status !== 'completed' && unsafeItems.length > 0 && (
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-red-800">
              {unsafeItems.length} item(s) marked as unsafe condition present require immediate attention.
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          {sections.map((section) => {
            const sectionProgress = getSectionProgress(section);
            const sectionItems = checklist.filter(item => item.section === section);
            const segments = createSegmentsForSection(sectionItems);
            
            return (
              <Collapsible key={section} open={openSections[section]} onOpenChange={() => toggleSection(section)}>
                <CollapsibleTrigger asChild>
                  <div className="relative overflow-hidden rounded-lg border bg-background shadow-sm">
                    <SegmentedProgress 
                      segments={segments}
                      className="absolute inset-0 h-full opacity-30"
                    />
                    <Button variant="ghost" className="relative w-full justify-between p-4 h-auto hover:bg-accent/50">
                      <div className="flex flex-col items-start gap-1">
                        <span className="font-semibold text-left">{section}</span>
                        <span className="text-xs text-muted-foreground">
                          {sectionProgress.completed}/{sectionProgress.total} items completed ({Math.round(sectionProgress.percentage)}%)
                        </span>
                      </div>
                      {openSections[section] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </Button>
                  </div>
                </CollapsibleTrigger>
              <CollapsibleContent
                className="pm-collapsible-animate space-y-3 pt-2 overflow-hidden data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 data-[state=open]:slide-in-from-top-2 data-[state=closed]:slide-out-to-top-2 data-[state=open]:duration-200 data-[state=closed]:duration-200"
              >
                {checklist.filter(item => item.section === section).map((item) => (
                  <div key={item.id} className={`p-4 border rounded-lg ${getItemBorderClass(item)}`}>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-2">
                          {isItemComplete(item) ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : (
                            <Circle className="h-4 w-4 text-red-600" />
                          )}
                          <span className="font-medium">{item.title}</span>
                        </div>
                        <span className={`text-sm font-medium ${getConditionColor(item.condition)}`}>
                          {getConditionText(item.condition)}
                        </span>
                      </div>
                      {item.description && (
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                      )}
                      
                      {!readOnly && pm.status !== 'completed' && (
                        <div className="flex items-start gap-2">
                          <div className="flex-1 space-y-2">
                            <Label className="text-sm font-medium">Maintenance Assessment:</Label>
                            <Select
                              value={item.condition?.toString() || ''}
                              onValueChange={(value) => handleChecklistItemChange(item.id, parseInt(value) as 1 | 2 | 3 | 4 | 5)}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select assessment..." />
                              </SelectTrigger>
                              <SelectContent>
                                {[
                                  { value: 1, label: 'OK', color: 'text-green-600' },
                                  { value: 2, label: 'Adjusted', color: 'text-yellow-600' },
                                  { value: 3, label: 'Recommend Repairs', color: 'text-orange-600' },
                                  { value: 4, label: 'Requires Immediate Repairs', color: 'text-red-600' },
                                  { value: 5, label: 'Unsafe Condition Present', color: 'text-red-800' }
                                ].map((rating) => (
                                  <SelectItem 
                                    key={rating.value} 
                                    value={rating.value.toString()}
                                    className={rating.color}
                                  >
                                    {rating.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 mt-6 shrink-0"
                            onClick={() => toggleNotesVisibility(item.id)}
                            aria-label={
                              shouldShowNotes(item) 
                                ? "Hide notes" 
                                : item.notes 
                                  ? "Show notes" 
                                  : "Add notes"
                            }
                          >
                            {item.notes ? (
                              <MessageSquareText className="h-4 w-4 text-primary" />
                            ) : (
                              <MessageSquare className="h-4 w-4 text-muted-foreground" />
                            )}
                          </Button>
                        </div>
                      )}

                      {/* Animated notes container */}
                      {!readOnly && pm.status !== 'completed' && (
                        <div
                          className={cn(
                            "grid min-h-0 transition-all duration-200 ease-out",
                            shouldShowNotes(item) ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                          )}
                        >
                          <div className="overflow-hidden min-h-0">
                            <Textarea
                              placeholder="Add notes for this item..."
                              value={item.notes || ''}
                              onChange={(e) => handleNotesItemChange(item.id, e.target.value)}
                              className="mt-2"
                              rows={2}
                            />
                          </div>
                        </div>
                      )}
                      {item.notes && (readOnly || pm.status === 'completed') && (
                        <div className="mt-2 p-2 bg-muted rounded text-sm">
                          <strong>Notes:</strong> {item.notes}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </CollapsibleContent>
            </Collapsible>
            );
          })}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">General Notes</label>
          <Textarea
            placeholder="Add general notes about this PM..."
            value={notes}
            onChange={(e) => handleNotesChange(e.target.value)}
            disabled={readOnly || pm.status === 'completed'}
            rows={3}
          />
        </div>

        {!readOnly && pm.status !== 'completed' && (
          <div className="flex gap-2 pt-4">
            <Button
              onClick={saveChanges}
              disabled={isUpdating}
              variant="outline"
            >
              {isUpdating ? 'Saving...' : 'Save Changes'}
            </Button>
            <Button
              onClick={completePM}
              disabled={isUpdating || unratedRequiredItems.length > 0 || unsafeItems.length > 0}
            >
              {isUpdating ? 'Completing...' : 'Complete PM'}
            </Button>
          </div>
        )}

        {/* Admin Revert Option for Completed PM */}
        {isAdmin && pm.status === 'completed' && (
          <div className="flex gap-2 pt-4 border-t">
            <Button
              onClick={revertPMCompletion}
              disabled={isReverting}
              variant="outline"
              className="border-amber-300 text-amber-800 hover:bg-amber-100"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              {isReverting ? 'Reverting...' : 'Revert Completion'}
            </Button>
          </div>
        )}

        {pm.completed_at && (
          <div className="pt-4 border-t text-sm text-muted-foreground">
            Completed on {new Date(pm.completed_at).toLocaleString()}
          </div>
        )}

        {/* Set All to OK Confirmation Dialog */}
        <AlertDialog open={showSetAllOKDialog} onOpenChange={setShowSetAllOKDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Set All Items to OK?</AlertDialogTitle>
              <AlertDialogDescription>
                This will set the condition of all checklist items to "OK". Any existing notes on the items will be preserved. 
                This action is useful when the equipment is already in good working order.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isSettingAllOK}>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleSetAllToOK}
                disabled={isSettingAllOK}
              >
                {isSettingAllOK ? 'Setting & Saving...' : 'Set All to OK & Save'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
};

export default PMChecklistComponent;
