import React, { useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useFormatTimestamp } from '@/hooks/useFormatTimestamp';
import { Edit2, Check, X, DollarSign, Package, Plus, Clock } from 'lucide-react';
import { WorkOrderCost } from '@/features/work-orders/services/workOrderCostsService';
import {
  calculateWorkOrderCostsSubtotal,
  formatWorkOrderCostCurrency,
} from '@/features/work-orders/utils/workOrderCostFormatters';
import { useWorkOrderCostsState, type WorkOrderCostItem } from '@/features/work-orders/hooks/useWorkOrderCostsState';
import { useIsMobile } from '@/hooks/use-mobile';
import { useInventoryAccess } from '@/features/inventory/hooks/useInventoryAccess';
import { InventoryPartSelector } from './InventoryPartSelector';
import WorkOrderCostsEditor from './WorkOrderCostsEditor';
import { WorkOrderCostReadOnlyList } from './WorkOrderCostReadOnlyList';
import { LaborCostDialog } from './LaborCostDialog';
import {
  WorkOrderCostDesktopReadOnlyRow,
  WorkOrderCostMobileReadOnlyRow,
} from './WorkOrderCostReadOnlyRows';
import { useInlineWorkOrderCostActions } from '@/features/work-orders/hooks/useInlineWorkOrderCostActions';
import { cn } from '@/lib/utils';
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

interface InlineEditWorkOrderCostsProps {
  costs: WorkOrderCost[];
  workOrderId: string;
  equipmentIds: string[];
  canEdit: boolean;
  /** Short empty state + dual CTAs for mobile field costs card */
  compactMobile?: boolean;
}

const InlineEditWorkOrderCosts: React.FC<InlineEditWorkOrderCostsProps> = ({
  costs,
  workOrderId,
  equipmentIds,
  canEdit,
  compactMobile = false,
}) => {
  const { formatDate } = useFormatTimestamp();
  const isMobile = useIsMobile();
  // Consuming parts requires inventory view access (owner/admin, Parts
  // Manager, or Parts Consumer). Users without a grant never see the
  // inventory picker.
  const { canView: canUseInventoryParts } = useInventoryAccess();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showInventorySelector, setShowInventorySelector] = useState(false);
  const [costValidationPhase, setCostValidationPhase] = useState<'pristine' | 'dirty'>('pristine');

  const {
    costs: editCosts,
    addCost,
    addFilledCost,
    removeCost,
    updateCost,
    getNewCosts,
    getUpdatedCosts,
    getDeletedCosts,
    getInventoryInfo,
    validateCosts,
    resetCosts,
    resetCostsWithMinimum,
  } = useWorkOrderCostsState(costs);

  const {
    laborDialogOpen,
    setLaborDialogOpen,
    laborHours,
    setLaborHours,
    laborRate,
    setLaborRate,
    laborNote,
    setLaborNote,
    deleteConfirmOpen,
    setDeleteConfirmOpen,
    costToDelete,
    setCostToDelete,
    handleStartEdit,
    handleSave,
    handleCancel,
    handleAddFromInventory,
    handleConfirmLabor,
    handleRemoveCost,
    confirmDelete,
    resetLaborForm,
    createCostMutation,
  } = useInlineWorkOrderCostActions({
    workOrderId,
    costs,
    isEditing,
    setIsEditing,
    setIsSaving,
    costValidationPhase,
    setCostValidationPhase,
    getNewCosts,
    getUpdatedCosts,
    getDeletedCosts,
    getInventoryInfo,
    validateCosts,
    resetCosts,
    resetCostsWithMinimum,
    removeCost,
    addFilledCost,
  });

  const formatCurrency = formatWorkOrderCostCurrency;
  const calculateSubtotal = () => calculateWorkOrderCostsSubtotal(costs);

  const wrappedUpdateCost = useCallback(
    (id: string, field: keyof WorkOrderCostItem, value: string | number) => {
      setCostValidationPhase('dirty');
      updateCost(id, field, value);
    },
    [updateCost],
  );

  const wrappedAddCost = () => {
    addCost();
  };

  if (!canEdit && costs.length === 0) {
    return (
      <div className="flex items-center gap-2 py-3 px-4 text-sm text-muted-foreground">
        <DollarSign className="h-4 w-4 opacity-50" />
        <span>No costs recorded</span>
      </div>
    );
  }

  if (!canEdit) {
    return (
      <div className="space-y-4">
        {costs.length > 0 && (
          <WorkOrderCostReadOnlyList
            costs={costs}
            isMobile={isMobile}
            formatCurrency={formatCurrency}
            calculateSubtotal={calculateSubtotal}
            renderMobileCost={(cost) => (
              <WorkOrderCostMobileReadOnlyRow cost={cost} formatDate={formatDate} />
            )}
            renderDesktopCost={(cost) => (
              <WorkOrderCostDesktopReadOnlyRow cost={cost} formatDate={formatDate} />
            )}
            className="space-y-4"
          />
        )}
      </div>
    );
  }

  if (!isEditing) {
    return (
      <div className="group">
        <div className={cn('flex items-center justify-between', compactMobile ? 'mb-2' : 'mb-4')}>
          <p className={cn('text-muted-foreground', compactMobile ? 'text-xs' : 'text-sm')}>
            {costs.length > 0
              ? `${costs.length} cost item${costs.length === 1 ? '' : 's'}`
              : 'No cost items yet'}
          </p>
          {costs.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
              onClick={handleStartEdit}
              aria-label="Edit costs"
              title="Edit costs"
            >
              <Edit2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>

        {costs.length > 0 ? (
          <WorkOrderCostReadOnlyList
            costs={costs}
            isMobile={isMobile}
            formatCurrency={formatCurrency}
            calculateSubtotal={calculateSubtotal}
            renderMobileCost={(cost) => (
              <WorkOrderCostMobileReadOnlyRow cost={cost} formatDate={formatDate} />
            )}
            renderDesktopCost={(cost) => (
              <WorkOrderCostDesktopReadOnlyRow cost={cost} formatDate={formatDate} />
            )}
            className={cn(compactMobile ? 'space-y-3' : 'space-y-4')}
          />
        ) : compactMobile ? (
          <div className="flex flex-wrap gap-2 pt-1">
            <Button type="button" variant="default" size="sm" className="min-h-[44px] flex-1" onClick={handleStartEdit}>
              <Plus className="h-4 w-4 mr-1.5" aria-hidden />
              Add cost
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="min-h-[44px] flex-1"
              onClick={() => setLaborDialogOpen(true)}
            >
              <Clock className="h-4 w-4 mr-1.5" aria-hidden />
              Add labor
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <DollarSign className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No costs recorded yet</p>
            <div className="flex flex-wrap justify-center gap-2">
              <Button variant="outline" size="sm" onClick={handleStartEdit}>
                <Plus className="h-4 w-4 mr-1.5" />
                Add Cost Item
              </Button>
              <Button variant="outline" size="sm" onClick={() => setLaborDialogOpen(true)}>
                <Clock className="h-4 w-4 mr-1.5" />
                Add labor
              </Button>
            </div>
          </div>
        )}
        <LaborCostDialog
          open={laborDialogOpen}
          onOpenChange={(open) => {
            setLaborDialogOpen(open);
            if (!open) resetLaborForm();
          }}
          laborHours={laborHours}
          laborRate={laborRate}
          laborNote={laborNote}
          onLaborHoursChange={setLaborHours}
          onLaborRateChange={setLaborRate}
          onLaborNoteChange={setLaborNote}
          onConfirm={handleConfirmLabor}
          isPending={createCostMutation.isPending}
        />
      </div>
    );
  }

  const costsHasInlineError = costValidationPhase === 'dirty' && !validateCosts();

  return (
    <div className="overflow-x-hidden">
      {isMobile ? (
        <div className="space-y-4">
          <h4 className="text-base font-semibold leading-snug text-foreground">Edit cost lines</h4>

          <div
            className={cn(
              'grid gap-2',
              equipmentIds.length > 0 && canUseInventoryParts ? 'grid-cols-2' : 'grid-cols-1',
            )}
          >
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="min-h-[44px] h-auto w-full whitespace-normal px-2 py-2 text-center leading-snug"
              onClick={() => setLaborDialogOpen(true)}
              disabled={isSaving}
            >
              <Clock className="mr-1 inline h-4 w-4 shrink-0 align-text-bottom" aria-hidden />
              Add labor
            </Button>
            {equipmentIds.length > 0 && canUseInventoryParts ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="min-h-[44px] h-auto w-full whitespace-normal px-2 py-2 text-center leading-snug"
                onClick={() => setShowInventorySelector(true)}
                disabled={isSaving}
              >
                <Package className="mr-1 inline h-4 w-4 shrink-0 align-text-bottom" aria-hidden />
                Add from Inventory
              </Button>
            ) : null}
          </div>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="min-h-[44px] h-auto w-full"
            onClick={wrappedAddCost}
            disabled={isSaving}
          >
            <Plus className="mr-2 h-4 w-4 shrink-0" aria-hidden />
            Add cost line
          </Button>

          <WorkOrderCostsEditor
            costs={editCosts}
            onAddCost={wrappedAddCost}
            onRemoveCost={handleRemoveCost}
            onUpdateCost={wrappedUpdateCost}
            hasError={costsHasInlineError}
            suppressMobileChrome
          />

          <div className="grid grid-cols-2 gap-2 border-t pt-3">
            <Button
              type="button"
              variant="default"
              size="sm"
              className="min-h-[44px]"
              onClick={() => void handleSave()}
              disabled={isSaving}
            >
              <Check className="mr-2 h-4 w-4 shrink-0" aria-hidden />
              Save
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="min-h-[44px]"
              onClick={handleCancel}
              disabled={isSaving}
            >
              <X className="mr-2 h-4 w-4 shrink-0" aria-hidden />
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <h4 className="text-sm font-medium">Edit Cost Items</h4>
            <div className="flex max-w-full flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setLaborDialogOpen(true)}
                disabled={isSaving}
              >
                <Clock className="h-4 w-4 mr-1" aria-hidden />
                Add labor
              </Button>
              {equipmentIds.length > 0 && canUseInventoryParts && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowInventorySelector(true)}
                  disabled={isSaving}
                >
                  <Package className="h-4 w-4 mr-1" aria-hidden />
                  Add from Inventory
                </Button>
              )}
              <Button type="button" variant="ghost" size="sm" onClick={() => void handleSave()} disabled={isSaving}>
                <Check className="h-4 w-4 mr-1" aria-hidden />
                Save
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={handleCancel} disabled={isSaving}>
                <X className="h-4 w-4 mr-1" aria-hidden />
                Cancel
              </Button>
            </div>
          </div>

          <WorkOrderCostsEditor
            costs={editCosts}
            onAddCost={wrappedAddCost}
            onRemoveCost={handleRemoveCost}
            onUpdateCost={wrappedUpdateCost}
            hasError={costsHasInlineError}
          />
        </>
      )}

      {showInventorySelector && equipmentIds.length > 0 && canUseInventoryParts && (
        <InventoryPartSelector
          open={showInventorySelector}
          onClose={() => setShowInventorySelector(false)}
          equipmentIds={equipmentIds}
          onSelect={handleAddFromInventory}
        />
      )}

      <LaborCostDialog
        open={laborDialogOpen}
        onOpenChange={(open) => {
          setLaborDialogOpen(open);
          if (!open) resetLaborForm();
        }}
        laborHours={laborHours}
        laborRate={laborRate}
        laborNote={laborNote}
        onLaborHoursChange={setLaborHours}
        onLaborRateChange={setLaborRate}
        onLaborNoteChange={setLaborNote}
        onConfirm={handleConfirmLabor}
        isPending={createCostMutation.isPending}
      />

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore Inventory?</AlertDialogTitle>
            <AlertDialogDescription>
              This cost item was added from inventory. Deleting it will restore{' '}
              <strong>{costToDelete?.quantity ?? 0} unit(s)</strong> back to the inventory.
              <br /><br />
              Are you sure you want to delete this cost and restore the inventory?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setCostToDelete(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>
              Delete & Restore Inventory
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default InlineEditWorkOrderCosts;
