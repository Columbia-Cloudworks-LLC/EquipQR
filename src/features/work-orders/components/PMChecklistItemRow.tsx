// fallow-ignore-file code-duplication
// Duplication rationale: Row renderer shares PDF metadata with report export service
import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SegmentedPills, type SegmentedPillOption } from '@/components/ui/segmented-pills';
import { MessageSquare, MessageSquareText, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PMChecklistItem, type PMChecklistCondition } from '@/features/pm-templates/services/preventativeMaintenanceService';
import { isNegativePMCondition, PM_CONDITION_NOT_APPLICABLE } from '@/utils/pmChecklistHelpers';

type TriState = 'ok' | 'attention' | 'na';
type AttentionSeverity = '2' | '3' | '4' | '5';

/** Severity applied when a technician taps "Attention" before choosing a level. */
const DEFAULT_ATTENTION_CONDITION: PMChecklistCondition = 3;

const TRI_STATE_OPTIONS: ReadonlyArray<SegmentedPillOption<TriState>> = [
  { value: 'ok', label: 'OK', tone: 'success' },
  { value: 'attention', label: 'Attention', tone: 'warning' },
  { value: 'na', label: 'N/A', ariaLabel: 'Not Applicable', tone: 'neutral' },
];

const SEVERITY_OPTIONS: ReadonlyArray<SegmentedPillOption<AttentionSeverity>> = [
  { value: '2', label: 'Adjusted', tone: 'warning' },
  { value: '3', label: 'Repair', ariaLabel: 'Recommend Repairs', tone: 'warning' },
  { value: '4', label: 'Immediate', ariaLabel: 'Requires Immediate Repairs', tone: 'destructive' },
  { value: '5', label: 'Unsafe', ariaLabel: 'Unsafe Condition Present', tone: 'destructive' },
];

function getTriState(condition: PMChecklistItem['condition']): TriState | null {
  if (condition === null || condition === undefined) return null;
  if (condition === 1) return 'ok';
  if (condition === PM_CONDITION_NOT_APPLICABLE) return 'na';
  return 'attention';
}

function getConditionColor(condition: number | null | undefined): string {
  if (condition === null || condition === undefined) return 'text-destructive';
  switch (condition) {
    case 1: return 'text-success';
    case PM_CONDITION_NOT_APPLICABLE: return 'text-muted-foreground';
    case 2: return 'text-warning';
    case 3: return 'text-warning';
    case 4: return 'text-destructive';
    case 5: return 'text-destructive';
    default: return 'text-muted-foreground';
  }
}

function getConditionText(condition: number | null | undefined): string {
  if (condition === null || condition === undefined) return 'Not Rated';
  switch (condition) {
    case 1: return 'OK';
    case PM_CONDITION_NOT_APPLICABLE: return 'Not Applicable';
    case 2: return 'Adjusted';
    case 3: return 'Recommend Repairs';
    case 4: return 'Requires Immediate Repairs';
    case 5: return 'Unsafe Condition Present';
    default: return 'Unknown';
  }
}

function getPhotoFileName(photoUrl: string): string {
  const path = photoUrl.split(/[?#]/)[0];
  const name = path.substring(path.lastIndexOf('/') + 1);
  try {
    return decodeURIComponent(name) || 'photo';
  } catch {
    return name || 'photo';
  }
}

function vibrate(): void {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(30);
}

interface PMChecklistItemRowProps {
  item: PMChecklistItem;
  readOnly: boolean;
  pmStatus: string;
  onConditionChange: (itemId: string, condition: PMChecklistCondition) => void;
  onToggleNotes: (itemId: string) => void;
  showNotes: boolean;
  onNotesChange: (itemId: string, notes: string) => void;
  /** When set, flagged items offer a one-tap follow-up repair work order. */
  onCreateFollowUp?: (item: PMChecklistItem) => void;
}

/**
 * One high-density checklist row: title on the left, one-tap OK / Attention / N/A
 * pills flush right. Severity and the note input only appear once an item is
 * flagged (or the note button is tapped), so clean items stay a single line.
 */
const PMChecklistItemRow = React.memo<PMChecklistItemRowProps>(function PMChecklistItemRow({
  item,
  readOnly,
  pmStatus,
  onConditionChange,
  onToggleNotes,
  showNotes,
  onNotesChange,
  onCreateFollowUp,
}) {
  const editable = !readOnly && pmStatus !== 'completed';
  const triState = getTriState(item.condition);
  const isUnrated = triState === null;
  const isAttention =
    item.condition !== null && item.condition !== undefined && isNegativePMCondition(item.condition);
  const isSettled = triState === 'ok' || triState === 'na';

  const handleTriStateChange = (next: TriState) => {
    if (next === 'ok') {
      onConditionChange(item.id, 1);
    } else if (next === 'na') {
      onConditionChange(item.id, PM_CONDITION_NOT_APPLICABLE);
    } else if (!isAttention) {
      onConditionChange(item.id, DEFAULT_ATTENTION_CONDITION);
    }
    vibrate();
  };

  return (
    <div className="py-2.5" data-pm-item-state={triState ?? 'unrated'}>
      {/* Phones: title on its own line, pills flush right below. Desktop: one row. */}
      <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span
            aria-hidden="true"
            className={cn(
              'h-1.5 w-1.5 shrink-0 rounded-full',
              isUnrated && item.required && 'bg-destructive',
              isUnrated && !item.required && 'bg-muted-foreground/40',
              isAttention && 'bg-warning',
              isSettled && 'bg-transparent',
            )}
          />
          <div className="min-w-0 flex-1">
            <p
              className={cn(
                'text-sm font-medium leading-snug',
                isSettled && 'font-normal text-muted-foreground',
              )}
            >
              {item.title}
              {isUnrated && item.required ? <span className="sr-only"> (required, not rated)</span> : null}
            </p>
            {item.description && !isSettled ? (
              <p className="hidden text-xs text-muted-foreground sm:line-clamp-1" title={item.description}>
                {item.description}
              </p>
            ) : null}
          </div>
        </div>

        {editable ? (
          <div className="flex shrink-0 items-center justify-end gap-1.5">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0 touch-manipulation sm:h-7 sm:w-7"
              onClick={() => onToggleNotes(item.id)}
              aria-label={showNotes ? 'Hide notes' : item.notes ? 'Show notes' : 'Add notes'}
            >
              {item.notes ? (
                <MessageSquareText className="h-3.5 w-3.5 text-primary" />
              ) : (
                <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
              )}
            </Button>
            <SegmentedPills
              size="dense"
              ariaLabel={`Assessment for ${item.title}`}
              value={triState}
              onValueChange={handleTriStateChange}
              options={TRI_STATE_OPTIONS}
              className="shrink-0"
            />
          </div>
        ) : (
          <span className={cn('shrink-0 pl-3.5 text-xs font-medium sm:pl-0', getConditionColor(item.condition))}>
            {getConditionText(item.condition)}
          </span>
        )}
      </div>

      {editable && isAttention ? (
        <div className="mt-2 flex flex-wrap items-center justify-end gap-2 sm:justify-start sm:pl-3.5">
          <SegmentedPills
            size="dense"
            ariaLabel={`Severity for ${item.title}`}
            value={String(item.condition) as AttentionSeverity}
            onValueChange={(next) => {
              onConditionChange(item.id, Number(next) as PMChecklistCondition);
              vibrate();
            }}
            options={SEVERITY_OPTIONS}
          />
        </div>
      ) : null}

      {editable && showNotes ? (
        <div className="mt-2 pl-3.5">
          <Input
            placeholder="Add notes for this item..."
            aria-label={`Notes for ${item.title}`}
            value={item.notes || ''}
            onChange={(e) => onNotesChange(item.id, e.target.value)}
            className="h-9 text-sm"
          />
        </div>
      ) : null}

      {item.photo_url ? (
        <div className="ml-3.5 mt-2 flex items-center gap-3 rounded-lg border border-border/70 bg-muted/60 p-2">
          <img
            src={item.photo_url}
            alt={`Defect on ${item.title}`}
            className="h-10 w-10 shrink-0 rounded-md border border-border object-cover shadow-sm"
          />
          <div className="min-w-0 flex-1">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
              <span className="inline-block h-2 w-2 rounded-full bg-destructive" />
              Defect Photo Attached
            </span>
            <p className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">
              {getPhotoFileName(item.photo_url)}
            </p>
          </div>
        </div>
      ) : null}

      {item.notes && !showNotes && editable ? (
        <div className="mt-1 truncate pl-3.5 text-xs text-muted-foreground">
          <span className="font-medium text-foreground/80">Note:</span> {item.notes}
        </div>
      ) : null}

      {item.notes && !editable ? (
        <div className="ml-3.5 mt-1.5 rounded border border-border/50 bg-muted px-2.5 py-1.5 text-sm text-foreground/90">
          <strong className="text-foreground">Notes:</strong> {item.notes}
        </div>
      ) : null}

      {isAttention && onCreateFollowUp ? (
        <div className="mt-1.5 pl-3.5">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 gap-1 px-2 text-xs text-primary hover:text-primary touch-manipulation"
            onClick={() => onCreateFollowUp(item)}
            aria-label={`Create follow-up work order for ${item.title}`}
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            Follow-Up WO
          </Button>
        </div>
      ) : null}
    </div>
  );
});

export default PMChecklistItemRow;
