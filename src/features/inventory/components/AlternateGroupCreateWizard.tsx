import React, { useState, useMemo } from 'react';
import { CheckCircle2, ChevronRight, ChevronLeft, Star, Search, Package } from 'lucide-react';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useInventoryItems } from '@/features/inventory/hooks/useInventory';
import {
  useCreateAlternateGroup,
  useAddInventoryItemToGroup,
} from '@/features/inventory/hooks/useAlternateGroups';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAppToast } from '@/hooks/useAppToast';
import type { VerificationStatus } from '@/features/inventory/types/inventory';
import type { InventoryItem } from '@/features/inventory/types/inventory';

interface WizardProps {
  onSuccess: (groupId: string) => void;
  onCancel: () => void;
}

interface SelectedItem {
  id: string;
  name: string;
  sku: string | null;
  quantity_on_hand: number;
}

const STEP_LABELS = ['Group Details', 'Select Parts', 'Review'] as const;

export const AlternateGroupCreateWizard: React.FC<WizardProps> = ({
  onSuccess,
  onCancel,
}) => {
  const { currentOrganization } = useOrganization();
  const { toast } = useAppToast();

  const [step, setStep] = useState(1);

  // Step 1: group details
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<VerificationStatus>('unverified');
  const [notes, setNotes] = useState('');
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [nameError, setNameError] = useState('');
  const [urlError, setUrlError] = useState('');

  // Step 2: part selection
  const [search, setSearch] = useState('');
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [primaryItemId, setPrimaryItemId] = useState<string | null>(null);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [partialError, setPartialError] = useState<string | null>(null);

  const createMutation = useCreateAlternateGroup();
  const addItemMutation = useAddInventoryItemToGroup();

  const { data: inventoryItems = [], isLoading: itemsLoading } = useInventoryItems(
    currentOrganization?.id
  );

  const filteredItems = useMemo(() => {
    if (!search.trim()) return inventoryItems.slice(0, 30);
    const needle = search.toLowerCase();
    return inventoryItems
      .filter(
        (item) =>
          item.name.toLowerCase().includes(needle) ||
          item.sku?.toLowerCase().includes(needle)
      )
      .slice(0, 30);
  }, [inventoryItems, search]);

  const selectedItems: SelectedItem[] = useMemo(
    () =>
      Array.from(selectedItemIds)
        .map((id) => inventoryItems.find((item) => item.id === id))
        .filter((item): item is InventoryItem => !!item)
        .map((item) => ({
          id: item.id,
          name: item.name,
          sku: item.sku,
          quantity_on_hand: item.quantity_on_hand,
        })),
    [selectedItemIds, inventoryItems]
  );

  const validateStep1 = () => {
    let valid = true;
    if (!name.trim()) {
      setNameError('Name is required');
      valid = false;
    } else if (name.trim().length > 200) {
      setNameError('Name must be 200 characters or fewer');
      valid = false;
    } else {
      setNameError('');
    }
    const urlVal = evidenceUrl.trim();
    if (urlVal && !/^https?:\/\/.+/.test(urlVal)) {
      setUrlError('Must be a valid URL starting with http:// or https://');
      valid = false;
    } else {
      setUrlError('');
    }
    return valid;
  };

  const toggleItem = (id: string) => {
    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        if (primaryItemId === id) {
          const remaining = Array.from(next);
          setPrimaryItemId(remaining.length > 0 ? remaining[0] : null);
        }
      } else {
        next.add(id);
        if (!primaryItemId) setPrimaryItemId(id);
      }
      return next;
    });
  };

  const handleCreate = async () => {
    if (!currentOrganization) return;
    setIsSubmitting(true);
    setPartialError(null);
    try {
      const group = await createMutation.mutateAsync({
        organizationId: currentOrganization.id,
        data: {
          name: name.trim(),
          description: description.trim() || undefined,
          status,
          notes: notes.trim() || undefined,
          evidence_url: evidenceUrl.trim() || undefined,
        },
      });

      const itemIds = Array.from(selectedItemIds);
      const effectivePrimary = primaryItemId ?? (itemIds.length > 0 ? itemIds[0] : null);
      const failures: string[] = [];

      for (const itemId of itemIds) {
        try {
          await addItemMutation.mutateAsync({
            organizationId: currentOrganization.id,
            groupId: group.id,
            inventoryItemId: itemId,
            isPrimary: itemId === effectivePrimary,
          });
        } catch {
          const item = inventoryItems.find((i) => i.id === itemId);
          failures.push(item?.name ?? itemId);
        }
      }

      if (failures.length > 0) {
        setPartialError(
          `Group created. Could not add: ${failures.join(', ')}. You can add them from the group detail page.`
        );
        toast({
          title: 'Group created with partial membership',
          description: `${failures.length} item${failures.length > 1 ? 's' : ''} could not be added.`,
          variant: 'error',
        });
      }

      onSuccess(group.id);
    } catch {
      // Error handled by the mutation hook toast
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Step indicator */}
      <div className="flex items-center gap-1">
        {STEP_LABELS.map((label, i) => {
          const stepNum = i + 1;
          const isActive = step === stepNum;
          const isDone = step > stepNum;
          return (
            <React.Fragment key={label}>
              {i > 0 && (
                <div className={`h-px flex-1 transition-colors ${isDone ? 'bg-primary' : 'bg-border'}`} />
              )}
              <div
                className={`flex items-center gap-1.5 text-sm ${
                  isActive
                    ? 'text-primary font-medium'
                    : isDone
                    ? 'text-primary/70'
                    : 'text-muted-foreground'
                }`}
              >
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs transition-colors ${
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : isDone
                      ? 'bg-primary/20 text-primary'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {isDone ? <CheckCircle2 className="h-3.5 w-3.5" /> : stepNum}
                </span>
                <span className="hidden sm:inline">{label}</span>
              </div>
            </React.Fragment>
          );
        })}
      </div>

      {/* Step 1: Group Details */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="wizard-name">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="wizard-name"
              placeholder="e.g., Oil Filter — CAT D6T Compatible"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
            {nameError && <p className="text-sm text-destructive">{nameError}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="wizard-description">Description</Label>
            <Textarea
              id="wizard-description"
              placeholder="Describe which OEM, aftermarket, or equivalent parts belong here."
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="wizard-status">Verification Status</Label>
            <Select
              value={status}
              onValueChange={(v) => setStatus(v as VerificationStatus)}
            >
              <SelectTrigger id="wizard-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unverified">Unverified</SelectItem>
                <SelectItem value="verified">Verified</SelectItem>
                <SelectItem value="deprecated">Deprecated</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Groups start as Unverified. Change to Verified after adding evidence and part numbers.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="wizard-notes">Verification Notes</Label>
            <Textarea
              id="wizard-notes"
              placeholder="Evidence or notes supporting this alternate relationship..."
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="wizard-evidence-url">Evidence URL</Label>
            <Input
              id="wizard-evidence-url"
              type="url"
              placeholder="https://example.com/cross-reference-guide"
              value={evidenceUrl}
              onChange={(e) => setEvidenceUrl(e.target.value)}
            />
            {urlError && <p className="text-sm text-destructive">{urlError}</p>}
            <p className="text-xs text-muted-foreground">
              Link to manufacturer cross-reference guide or other verification source.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => {
                if (validateStep1()) setStep(2);
              }}
            >
              Select Parts
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Select Parts */}
      {step === 2 && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Select inventory items that can substitute for each other. You can add more from the group
            detail page after creation.
          </p>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search by name or SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              autoFocus
            />
          </div>

          <div className="max-h-52 overflow-y-auto border rounded-md divide-y">
            {itemsLoading ? (
              <p className="text-sm text-muted-foreground text-center py-6">Loading inventory...</p>
            ) : filteredItems.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                {inventoryItems.length === 0
                  ? 'No inventory items found.'
                  : 'No items match your search.'}
              </p>
            ) : (
              filteredItems.map((item) => {
                const isSelected = selectedItemIds.has(item.id);
                const isPrimary = item.id === primaryItemId;
                return (
                  <div
                    key={item.id}
                    className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-muted/50 transition-colors ${
                      isSelected ? 'bg-primary/5' : ''
                    }`}
                    onClick={() => toggleItem(item.id)}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleItem(item.id)}
                      onClick={(e) => e.stopPropagation()}
                      aria-label={`Select ${item.name}`}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.sku ? `SKU: ${item.sku} · ` : ''}Qty: {item.quantity_on_hand}
                      </p>
                    </div>
                    {isSelected && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPrimaryItemId(item.id);
                        }}
                        className={`shrink-0 flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border transition-colors ${
                          isPrimary
                            ? 'border-warning text-warning bg-warning/10'
                            : 'border-muted-foreground/30 text-muted-foreground hover:border-warning/60 hover:text-warning/70'
                        }`}
                        aria-label={isPrimary ? 'Primary part' : `Mark ${item.name} as primary`}
                      >
                        <Star className="h-3 w-3" />
                        {isPrimary ? 'Primary' : 'Set primary'}
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {selectedItemIds.size > 0 && (
            <p className="text-sm text-muted-foreground">
              {selectedItemIds.size} part{selectedItemIds.size > 1 ? 's' : ''} selected
              {primaryItemId && (
                <>
                  {' — '}
                  <span className="text-warning font-medium">
                    {inventoryItems.find((i) => i.id === primaryItemId)?.name ?? primaryItemId}
                  </span>{' '}
                  marked as primary
                </>
              )}
            </p>
          )}

          <div className="flex justify-between gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setStep(1)}>
              <ChevronLeft className="mr-1 h-4 w-4" />
              Back
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={() => setStep(3)}>
                Skip
              </Button>
              <Button type="button" onClick={() => setStep(3)}>
                Review
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Review */}
      {step === 3 && (
        <div className="space-y-4">
          {partialError && (
            <div className="rounded-md bg-warning/10 border border-warning/30 p-3 text-sm text-warning-foreground">
              {partialError}
            </div>
          )}

          <div className="rounded-md border p-3 space-y-1">
            <p className="font-semibold">{name}</p>
            {description && <p className="text-sm text-muted-foreground">{description}</p>}
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-xs capitalize">
                {status}
              </Badge>
            </div>
          </div>

          {selectedItems.length > 0 ? (
            <div className="space-y-2">
              <p className="text-sm font-medium">
                {selectedItems.length} part{selectedItems.length > 1 ? 's' : ''} to add:
              </p>
              <div className="max-h-44 overflow-y-auto border rounded-md divide-y">
                {selectedItems.map((item) => (
                  <div key={item.id} className="flex items-center gap-2 px-3 py-2">
                    {item.id === primaryItemId && (
                      <Star className="h-3.5 w-3.5 text-warning shrink-0" aria-label="Primary" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.name}</p>
                      {item.sku && (
                        <p className="text-xs text-muted-foreground">SKU: {item.sku}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-muted-foreground border rounded-md p-3">
              <Package className="h-4 w-4 shrink-0" />
              No parts selected — you can add them from the group detail page after creation.
            </div>
          )}

          <div className="flex justify-between gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setStep(2)}>
              <ChevronLeft className="mr-1 h-4 w-4" />
              Back
            </Button>
            <Button
              type="button"
              onClick={handleCreate}
              disabled={isSubmitting || createMutation.isPending}
            >
              {isSubmitting ? 'Creating...' : 'Create Group'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
