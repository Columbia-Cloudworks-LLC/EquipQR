import React, { useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import {
  Sheet,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { MobileToolbarSheetContent } from '@/components/common/MobileToolbarSheetContent';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Forklift, Loader2, AlertCircle, Filter } from 'lucide-react';
import { usePMTemplate } from '@/features/pm-templates/hooks/usePMTemplates';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useEquipment } from '@/features/equipment/hooks/useEquipment';
import { useBulkAssignTemplate } from '@/features/equipment/hooks/useEquipmentTemplateManagement';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  EquipmentLocationSelect,
  EquipmentManufacturerSelect,
  EquipmentStatusSelect,
} from '@/features/equipment/components/EquipmentFilterSelects';
import type { EquipmentRecord } from '@/features/equipment/types/equipment';
import {
  countActiveTemplateAssignmentFilters,
  deriveTemplateAssignmentFilterOptions,
  filterEquipmentForTemplateAssignment,
  initialTemplateAssignmentFilters,
  type PmTemplateAssignmentFilter,
  type TemplateAssignmentFilters,
} from '@/features/pm-templates/utils/templateAssignmentFilters';
import { cn } from '@/lib/utils';

interface TemplateAssignmentDialogProps {
  templateId: string;
  open: boolean;
  onClose: () => void;
}

const FULL_DESCRIPTION =
  'Select equipment to update. This sets the default PM template on each record (the same field as on the equipment details page). New PM work orders for that equipment will use this checklist automatically.';

const MOBILE_DESCRIPTION =
  'Sets the default PM template on selected equipment. New PM work orders will use this checklist automatically.';

function PmTemplateStateSelect({
  value,
  onValueChange,
  triggerId,
  triggerClassName,
}: {
  value: PmTemplateAssignmentFilter;
  onValueChange: (value: PmTemplateAssignmentFilter) => void;
  triggerId?: string;
  triggerClassName?: string;
}) {
  return (
    <Select value={value} onValueChange={(next) => onValueChange(next as PmTemplateAssignmentFilter)}>
      <SelectTrigger id={triggerId} className={triggerClassName} aria-label="Filter by PM template">
        <SelectValue placeholder="PM template" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All equipment</SelectItem>
        <SelectItem value="unassigned">No PM template</SelectItem>
        <SelectItem value="assigned">Has PM template</SelectItem>
      </SelectContent>
    </Select>
  );
}

function TemplateAssignmentEquipmentRow({
  equipment,
  checked,
  compact,
  onCheckedChange,
}: {
  equipment: EquipmentRecord;
  checked: boolean;
  compact: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  const metaLine = [equipment.manufacturer, equipment.model, equipment.serial_number]
    .filter(Boolean)
    .join(' · ');

  return (
    <label
      className={cn(
        'flex min-h-[44px] cursor-pointer touch-manipulation gap-3 rounded-lg border border-border/60 px-3 py-3 hover:bg-muted/50',
        compact && 'py-2.5',
      )}
    >
      <Checkbox
        checked={checked}
        onCheckedChange={(next) => onCheckedChange(next === true)}
        className="mt-0.5 shrink-0"
        aria-label={`Select ${equipment.name}`}
      />
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex min-w-0 items-start gap-2">
          <Forklift className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          <p className="min-w-0 flex-1 font-medium leading-snug">{equipment.name}</p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 pl-6">
          <Badge variant="outline" className="text-xs">
            {equipment.status}
          </Badge>
          {equipment.default_pm_template_id ? (
            <Badge variant="secondary" className="text-xs">
              Has PM template
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs text-muted-foreground">
              No PM template
            </Badge>
          )}
        </div>
        {metaLine ? (
          <p className="truncate pl-6 text-sm text-muted-foreground">{metaLine}</p>
        ) : null}
        {equipment.location ? (
          <p className="truncate pl-6 text-xs text-muted-foreground">{equipment.location}</p>
        ) : null}
      </div>
    </label>
  );
}

function TemplateAssignmentFilterFields({
  filters,
  filterOptions,
  onFilterChange,
  onClearFilters,
  idPrefix,
  compactTrigger = false,
}: {
  filters: TemplateAssignmentFilters;
  filterOptions: { manufacturers: string[]; locations: string[] };
  onFilterChange: (patch: Partial<TemplateAssignmentFilters>) => void;
  onClearFilters: () => void;
  idPrefix: string;
  compactTrigger?: boolean;
}) {
  const triggerClassName = compactTrigger ? 'h-11' : undefined;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</p>
        <EquipmentStatusSelect
          value={filters.status}
          onValueChange={(value) => onFilterChange({ status: value })}
          placeholder="Status"
          triggerId={`${idPrefix}-status`}
          triggerClassName={triggerClassName}
        />
      </div>

      {filterOptions.manufacturers.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Manufacturer
          </p>
          <EquipmentManufacturerSelect
            value={filters.manufacturer}
            onValueChange={(value) => onFilterChange({ manufacturer: value })}
            manufacturers={filterOptions.manufacturers}
            triggerId={`${idPrefix}-manufacturer`}
            triggerClassName={triggerClassName}
          />
        </div>
      ) : null}

      {filterOptions.locations.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Location
          </p>
          <EquipmentLocationSelect
            value={filters.location}
            onValueChange={(value) => onFilterChange({ location: value })}
            locations={filterOptions.locations}
            triggerId={`${idPrefix}-location`}
            triggerClassName={triggerClassName}
          />
        </div>
      ) : null}

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          PM template
        </p>
        <PmTemplateStateSelect
          value={filters.pmTemplate}
          onValueChange={(value) => onFilterChange({ pmTemplate: value })}
          triggerId={`${idPrefix}-pm-template`}
          triggerClassName={triggerClassName}
        />
      </div>

      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={onClearFilters}
        disabled={countActiveTemplateAssignmentFilters(filters) === 0}
      >
        Clear filters
      </Button>
    </div>
  );
}

type TemplateAssignmentBodyProps = {
  templateName: string;
  isMobile: boolean;
  filters: TemplateAssignmentFilters;
  filterOptions: { manufacturers: string[]; locations: string[] };
  activeFilterCount: number;
  filteredEquipment: EquipmentRecord[];
  selectedEquipment: string[];
  showReplaceWarning: boolean;
  isPending: boolean;
  onFilterChange: (patch: Partial<TemplateAssignmentFilters>) => void;
  onClearFilters: () => void;
  onSelectEquipment: (equipmentId: string, checked: boolean) => void;
  onSelectAll: (checked: boolean) => void;
  onAssignTemplate: () => void;
  onClose: () => void;
};

function TemplateAssignmentBody({
  templateName,
  isMobile,
  filters,
  filterOptions,
  activeFilterCount,
  filteredEquipment,
  selectedEquipment,
  showReplaceWarning,
  isPending,
  onFilterChange,
  onClearFilters,
  onSelectEquipment,
  onSelectAll,
  onAssignTemplate,
  onClose,
}: TemplateAssignmentBodyProps) {
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const visibleSelectedCount = selectedEquipment.filter((id) =>
    filteredEquipment.some((item) => item.id === id),
  ).length;
  const hiddenSelectedCount = selectedEquipment.length - visibleSelectedCount;
  const allVisibleSelected =
    filteredEquipment.length > 0 &&
    filteredEquipment.every((item) => selectedEquipment.includes(item.id));

  const header = isMobile ? (
    <DrawerHeader className="shrink-0 px-4 pb-2 pt-2 text-left">
      <DrawerTitle className="pr-8 text-base leading-snug">
        Apply &ldquo;{templateName}&rdquo;
      </DrawerTitle>
      <DrawerDescription>{MOBILE_DESCRIPTION}</DrawerDescription>
    </DrawerHeader>
  ) : (
    <DialogHeader className="shrink-0 px-6 pb-2 pt-6 text-left">
      <DialogTitle>Apply &ldquo;{templateName}&rdquo; to Equipment</DialogTitle>
      <DialogDescription>{FULL_DESCRIPTION}</DialogDescription>
    </DialogHeader>
  );

  const toolbar = (
    <div className="shrink-0 space-y-3 px-4 sm:px-6">
      {showReplaceWarning ? (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Some selected equipment already have assigned PM templates. Assigning this template will
            replace their existing assignments.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="flex items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="template-assignment-search"
            placeholder="Search name, model, or serial..."
            value={filters.search}
            onChange={(event) => onFilterChange({ search: event.target.value })}
            className={cn('pl-9', isMobile ? 'h-11' : undefined)}
            aria-label="Search equipment"
          />
        </div>

        {isMobile ? (
          <Sheet open={isFilterSheetOpen} onOpenChange={setIsFilterSheetOpen}>
            <SheetTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="relative h-11 w-11 shrink-0"
                aria-label="Open equipment filters"
              >
                <Filter className="h-4 w-4" />
                {activeFilterCount > 0 ? (
                  <Badge
                    variant="secondary"
                    className="absolute -right-1 -top-1 h-5 min-w-5 px-1 text-[10px]"
                  >
                    {activeFilterCount}
                  </Badge>
                ) : null}
              </Button>
            </SheetTrigger>
            <MobileToolbarSheetContent>
              <SheetHeader className="pb-2 text-left">
                <SheetTitle>Filter equipment</SheetTitle>
                <SheetDescription>Narrow the list before selecting equipment.</SheetDescription>
              </SheetHeader>
              <div className="pb-8 pt-2">
                <TemplateAssignmentFilterFields
                  filters={filters}
                  filterOptions={filterOptions}
                  onFilterChange={onFilterChange}
                  onClearFilters={() => {
                    onClearFilters();
                    setIsFilterSheetOpen(false);
                  }}
                  idPrefix="template-assignment-mobile"
                  compactTrigger
                />
              </div>
            </MobileToolbarSheetContent>
          </Sheet>
        ) : null}
      </div>

      {isMobile ? (
        <div className="flex gap-2 overflow-x-auto pb-1">
          <Button
            type="button"
            size="sm"
            variant={filters.pmTemplate === 'unassigned' ? 'default' : 'outline'}
            className="shrink-0"
            onClick={() =>
              onFilterChange({
                pmTemplate: filters.pmTemplate === 'unassigned' ? 'all' : 'unassigned',
              })
            }
          >
            Unassigned only
          </Button>
          <Button
            type="button"
            size="sm"
            variant={filters.pmTemplate === 'assigned' ? 'default' : 'outline'}
            className="shrink-0"
            onClick={() =>
              onFilterChange({
                pmTemplate: filters.pmTemplate === 'assigned' ? 'all' : 'assigned',
              })
            }
          >
            Has template
          </Button>
        </div>
      ) : (
        <TemplateAssignmentFilterFields
          filters={filters}
          filterOptions={filterOptions}
          onFilterChange={onFilterChange}
          onClearFilters={onClearFilters}
          idPrefix="template-assignment-desktop"
        />
      )}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {visibleSelectedCount} of {filteredEquipment.length} visible selected
          {hiddenSelectedCount > 0 ? (
            <span className="ml-2 text-xs">({hiddenSelectedCount} hidden)</span>
          ) : null}
        </p>
        <div className="flex items-center gap-2">
          <Checkbox
            id="template-assignment-select-all"
            checked={allVisibleSelected}
            onCheckedChange={(checked) => onSelectAll(checked === true)}
          />
          <Label htmlFor="template-assignment-select-all" className="text-sm font-normal">
            Select all visible ({filteredEquipment.length})
          </Label>
        </div>
      </div>
    </div>
  );

  const list = (
    <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 sm:px-6">
      <div className="space-y-2">
        {filteredEquipment.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No equipment matches your search and filters.
          </p>
        ) : (
          filteredEquipment.map((item) => (
            <TemplateAssignmentEquipmentRow
              key={item.id}
              equipment={item}
              checked={selectedEquipment.includes(item.id)}
              compact={isMobile}
              onCheckedChange={(checked) => onSelectEquipment(item.id, checked)}
            />
          ))
        )}
      </div>
    </div>
  );

  const footer = isMobile ? (
    <DrawerFooter className="shrink-0 border-t px-4 pb-safe-bottom pt-3">
      <Button
        type="button"
        onClick={onAssignTemplate}
        disabled={selectedEquipment.length === 0 || isPending}
        className="min-h-[44px] gap-2 touch-manipulation"
      >
        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Apply to {selectedEquipment.length} equipment
      </Button>
      <Button type="button" variant="outline" onClick={onClose} className="min-h-[44px]">
        Cancel
      </Button>
    </DrawerFooter>
  ) : (
    <DialogFooter className="shrink-0 border-t px-6 py-4 sm:justify-end">
      <Button type="button" variant="outline" onClick={onClose}>
        Cancel
      </Button>
      <Button
        type="button"
        onClick={onAssignTemplate}
        disabled={selectedEquipment.length === 0 || isPending}
        className="gap-2"
      >
        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Set default PM on {selectedEquipment.length} equipment
      </Button>
    </DialogFooter>
  );

  return (
    <>
      {header}
      {toolbar}
      {list}
      {footer}
    </>
  );
}

export const TemplateAssignmentDialog: React.FC<TemplateAssignmentDialogProps> = ({
  templateId,
  open,
  onClose,
}) => {
  const isMobile = useIsMobile();
  const { currentOrganization } = useOrganization();
  const { data: template } = usePMTemplate(templateId);
  const { data: equipment = [] } = useEquipment(currentOrganization?.id);
  const bulkAssignTemplate = useBulkAssignTemplate();

  const [selectedEquipment, setSelectedEquipment] = useState<string[]>([]);
  const [filters, setFilters] = useState<TemplateAssignmentFilters>(
    initialTemplateAssignmentFilters,
  );

  const filterOptions = useMemo(
    () => deriveTemplateAssignmentFilterOptions(equipment),
    [equipment],
  );

  const filteredEquipment = useMemo(
    () => filterEquipmentForTemplateAssignment(equipment, filters),
    [equipment, filters],
  );

  const activeFilterCount = countActiveTemplateAssignmentFilters(filters);

  const equipmentIdsWithExistingTemplate = useMemo(
    () =>
      new Set(
        equipment.filter((item) => item.default_pm_template_id).map((item) => item.id),
      ),
    [equipment],
  );

  const showReplaceWarning = selectedEquipment.some((id) =>
    equipmentIdsWithExistingTemplate.has(id),
  );

  const resetState = () => {
    setSelectedEquipment([]);
    setFilters(initialTemplateAssignmentFilters);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleFilterChange = (patch: Partial<TemplateAssignmentFilters>) => {
    setFilters((current) => ({ ...current, ...patch }));
  };

  const handleClearFilters = () => {
    setFilters((current) => ({
      ...initialTemplateAssignmentFilters,
      search: current.search,
    }));
  };

  const handleSelectEquipment = (equipmentId: string, checked: boolean) => {
    if (checked) {
      setSelectedEquipment((current) => [...current, equipmentId]);
      return;
    }
    setSelectedEquipment((current) => current.filter((id) => id !== equipmentId));
  };

  const handleSelectAll = (checked: boolean) => {
    const visibleIds = filteredEquipment.map((item) => item.id);
    if (checked) {
      setSelectedEquipment((current) => [...new Set([...current, ...visibleIds])]);
      return;
    }
    setSelectedEquipment((current) => current.filter((id) => !visibleIds.includes(id)));
  };

  const handleAssignTemplate = async () => {
    if (!template || !currentOrganization || selectedEquipment.length === 0) return;

    try {
      await bulkAssignTemplate.mutateAsync({
        equipmentIds: selectedEquipment,
        templateId: template.id,
      });
      handleClose();
    } catch (error) {
      console.error('Error assigning template:', error);
    }
  };

  if (!template) {
    return null;
  }

  const bodyProps: TemplateAssignmentBodyProps = {
    templateName: template.name,
    isMobile,
    filters,
    filterOptions,
    activeFilterCount,
    filteredEquipment,
    selectedEquipment,
    showReplaceWarning,
    isPending: bulkAssignTemplate.isPending,
    onFilterChange: handleFilterChange,
    onClearFilters: handleClearFilters,
    onSelectEquipment: handleSelectEquipment,
    onSelectAll: handleSelectAll,
    onAssignTemplate: handleAssignTemplate,
    onClose: handleClose,
  };

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={(nextOpen) => !nextOpen && handleClose()}>
        <DrawerContent className="flex max-h-[90dvh] flex-col p-0">
          <TemplateAssignmentBody {...bodyProps} />
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && handleClose()}>
      <DialogContent className="flex max-h-[calc(100dvh-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <TemplateAssignmentBody {...bodyProps} />
      </DialogContent>
    </Dialog>
  );
};
