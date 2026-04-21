import React, { useEffect, useRef, useState } from 'react';
import { Edit2 } from 'lucide-react';

import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

export type BulkEditableCellType = 'text' | 'number' | 'select';

export interface BulkEditableCellSelectOption {
  value: string;
  label: string;
}

export interface BulkEditableCellProps {
  rowId: string;
  /** Field name on `EquipmentRecord` — used for accessible labels and as the
   *  diff key when the parent stores per-row deltas. */
  field: string;
  /** The currently displayed value (initial OR pending dirty value). */
  value: string | number | null;
  /** The original, pre-edit value. The cell renders a dirty accent when these differ. */
  initialValue: string | number | null;
  type: BulkEditableCellType;
  /** Required when `type === 'select'`. */
  selectOptions?: BulkEditableCellSelectOption[];
  /** Right-align the displayed value (used for numeric columns). */
  align?: 'left' | 'right';
  /** Render in monospace (used for serial / id columns). */
  mono?: boolean;
  /** Optional format function for the static display state (e.g. number locale). */
  formatDisplay?: (value: string | number | null) => string;
  /** Called when the user commits an edit. */
  onChange: (value: string | number | null) => void;
  /** Toggle the row's selection. Triggered by the keyboard Space gesture on a
   *  focused static cell. Single-click selection is now handled at the
   *  `<TableRow>` level (so empty-area clicks also select), but the cell still
   *  needs its own handle for keyboard-only users. */
  onSelectRow: (id: string) => void;
  /** Cancel a pending row-level single-click selection toggle. Invoked when
   *  the user double-clicks the cell so the deferred row toggle is dropped
   *  before the editor mounts. Passed from `BulkEquipmentGrid` which owns the
   *  click-vs-doubleclick debounce timer. */
  onCancelPendingSelect?: () => void;
}

const EMPTY_DISPLAY = '—';

const isDirty = (
  value: string | number | null,
  initialValue: string | number | null
): boolean => {
  // `null` and empty string are considered equivalent for diff purposes —
  // matches how `EquipmentForm` normalizes optional fields.
  const v = value === '' ? null : value;
  const iv = initialValue === '' ? null : initialValue;
  return !Object.is(v, iv);
};

/**
 * Editable cell for the bulk-edit equipment grid (#627).
 *
 * Static state shows the value with a hover tint + reveal pencil icon. Single-
 * click toggles the row's selection (does NOT enter edit). Double-click — or
 * pressing Enter / Space when the cell is keyboard-focused — mounts the
 * inline editor: an `<Input>` for text/number columns or a `<Select>` for
 * enumerated columns. Enter commits, Escape reverts, click-outside commits.
 *
 * Dirty cells (current value !== initial value) show a left-border accent so
 * the user can spot un-saved edits at a glance.
 */
export const BulkEditableCell: React.FC<BulkEditableCellProps> = ({
  rowId,
  field,
  value,
  initialValue,
  type,
  selectOptions,
  align = 'left',
  mono = false,
  formatDisplay,
  onChange,
  onSelectRow,
  onCancelPendingSelect,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState<string>(() => stringifyForInput(value));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Keep the editor's local string in sync when the displayed value changes
    // externally (e.g., after a successful commit clears the dirty delta).
    setEditValue(stringifyForInput(value));
  }, [value]);

  const enterEdit = () => {
    setEditValue(stringifyForInput(value));
    setIsEditing(true);
  };

  const commitText = () => {
    setIsEditing(false);
    if (type === 'number') {
      const trimmed = editValue.trim();
      if (trimmed === '') {
        onChange(null);
      } else {
        const parsed = Number(trimmed);
        if (Number.isFinite(parsed)) {
          onChange(parsed);
        }
        // Non-numeric input is silently rejected — re-running the effect
        // resets editValue to the displayed value on next render.
      }
      return;
    }
    onChange(editValue);
  };

  const cancelEdit = () => {
    setEditValue(stringifyForInput(value));
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitText();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelEdit();
    }
  };

  const handleStaticKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    // Keyboard parity with the mouse gestures: Enter mounts the editor,
    // Space toggles the row's bulk-apply selection. Pairs with the row-level
    // `<TableRow onClick>` selection handling so non-mouse users have a real
    // path to add/remove rows from the selection set.
    if (e.key === 'Enter') {
      e.preventDefault();
      enterEdit();
    } else if (e.key === ' ') {
      e.preventDefault();
      onSelectRow(rowId);
    }
  };

  const handleStaticDoubleClick = () => {
    // Double-click cancels the row-level pending single-click toggle so the
    // selection set isn't mutated when the user really wanted to enter edit.
    // The row debounce timer lives on the parent (`BulkEquipmentGrid`) so it
    // can be shared with the empty-area click target on the row.
    onCancelPendingSelect?.();
    enterEdit();
  };

  const dirty = isDirty(value, initialValue);
  const displayText =
    value === null || value === '' || value === undefined
      ? EMPTY_DISPLAY
      : formatDisplay
        ? formatDisplay(value)
        : String(value);

  if (isEditing) {
    if (type === 'select') {
      const opts = selectOptions ?? [];
      return (
        <Select
          defaultOpen
          value={typeof value === 'string' ? value : ''}
          onValueChange={(next) => {
            setIsEditing(false);
            onChange(next);
          }}
          onOpenChange={(open) => {
            // Closing without selection (e.g. clicking outside or Escape) — exit edit.
            if (!open) setIsEditing(false);
          }}
        >
          <SelectTrigger
            aria-label={`Edit ${field}`}
            className={cn('h-8', dirty && 'border-l-2 border-l-primary')}
            onClick={stopBubbling}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {opts.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    return (
      <Input
        ref={inputRef}
        type={type === 'number' ? 'number' : 'text'}
        autoFocus
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={commitText}
        onClick={stopBubbling}
        aria-label={`Edit ${field}`}
        className={cn(
          'h-8',
          align === 'right' && 'text-right',
          mono && 'font-mono',
          dirty && 'border-l-2 border-l-primary'
        )}
      />
    );
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`${field}: ${displayText}. Single-click row to select, double-click to edit.`}
      onDoubleClick={handleStaticDoubleClick}
      onKeyDown={handleStaticKeyDown}
      className={cn(
        'group flex h-8 min-w-0 items-center justify-between gap-1 rounded-sm px-2',
        'cursor-pointer transition-colors',
        'hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
        align === 'right' && 'flex-row-reverse',
        dirty && 'border-l-2 border-l-primary'
      )}
    >
      <span
        className={cn(
          'truncate',
          mono && 'font-mono',
          (value === null || value === '' || value === undefined) && 'text-muted-foreground'
        )}
      >
        {displayText}
      </span>
      <Edit2
        className="h-3 w-3 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-50"
        aria-hidden
      />
    </div>
  );
};

function stringifyForInput(value: string | number | null): string {
  if (value === null || value === undefined) return '';
  return String(value);
}

// Stop click events inside an active editor from bubbling to the row's
// `onClick` selection handler — without this, every click inside the Input or
// Select trigger while editing would also schedule a row-selection toggle.
function stopBubbling(e: React.MouseEvent): void {
  e.stopPropagation();
}
