
import React, { useRef, useState } from 'react';
import { useMountFocus } from '@/components/a11y/keyboard';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Edit2 } from 'lucide-react';
import { SegmentedPills } from '@/components/ui/segmented-pills';
import { logger } from '@/utils/logger';
import { cn } from '@/lib/utils';
import { useFormatTimestamp } from '@/hooks/useFormatTimestamp';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  desktopHoverEditIconClassName,
  desktopInlineEditRowClassName,
  inlineEditIconClassName,
  mobileInlineEditRowClassName,
  mobileInlineEditValueClassName,
} from './inlineEditStyles';

/** Empty inline field: em dash in body style, not monospace (overrides parent font-mono on SKU/external ID). */
function EmptyFieldDisplay({ className }: { className?: string }) {
  return (
    <span
      className={cn('text-muted-foreground/50 not-italic font-sans', className)}
      aria-label="No value set"
    >
      —
    </span>
  );
}

interface InlineEditFieldProps {
  value: string;
  onSave: (newValue: string) => Promise<void>;
  canEdit: boolean;
  fieldId?: string;
  type?: 'text' | 'textarea' | 'date' | 'select' | 'number';
  selectOptions?: { value: string; label: string }[];
  placeholder?: string;
  className?: string;
  displayNode?: React.ReactNode;
  /**
   * Accessible label for the inline edit trigger. Defaults to "Edit" for
   * back-compat; pass a field-specific value (e.g. "Edit status") so assistive
   * tech and automation can target the right row when several inline editors
   * sit side-by-side.
   */
  editAriaLabel?: string;
}

/** Selects with this many options or fewer are edited as one-tap pills instead of a dropdown. */
const MAX_PILL_OPTIONS = 5;

/** Clicks on these inside the value (links, nested buttons) keep their own behavior. */
const NESTED_INTERACTIVE_SELECTOR = 'a, button, input, select, textarea, [role="button"], [role="link"]';

const InlineEditField: React.FC<InlineEditFieldProps> = ({
  value,
  onSave,
  canEdit,
  fieldId,
  type = 'text',
  selectOptions,
  placeholder,
  className = '',
  displayNode,
  editAriaLabel
}) => {
  const { formatDate } = useFormatTimestamp();
  const isMobile = useIsMobile();
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [isSaving, setIsSaving] = useState(false);
  // Shown in place of `value` while a save is in flight, so the field never flickers back.
  const [optimisticValue, setOptimisticValue] = useState<string | null>(null);
  // Escape and Enter both blur the input; this stops the blur from saving a second time.
  const skipBlurSaveRef = useRef(false);
  const textInputRef = useMountFocus<HTMLInputElement>(isEditing && type !== 'textarea' && type !== 'select');
  const textareaRef = useMountFocus<HTMLTextAreaElement>(isEditing && type === 'textarea');

  const pillsContainerRef = useRef<HTMLDivElement | null>(null);
  const usesPills = type === 'select' && !!selectOptions && selectOptions.length <= MAX_PILL_OPTIONS;

  // Focus the active pill so Escape and clicking away can dismiss the picker.
  React.useEffect(() => {
    if (!isEditing || !usesPills) return;
    const container = pillsContainerRef.current;
    const target =
      container?.querySelector<HTMLElement>('[data-state="on"]') ??
      container?.querySelector<HTMLElement>('button');
    target?.focus();
  }, [isEditing, usesPills]);

  // Update editValue when value prop changes
  React.useEffect(() => {
    setEditValue(value);
    setOptimisticValue(null);
  }, [value]);

  const startEditing = () => {
    skipBlurSaveRef.current = false;
    setEditValue(optimisticValue ?? value);
    setIsEditing(true);
  };

  /** Leaves edit mode immediately and saves in the background; reverts if the save fails. */
  const commit = async (nextValue: string) => {
    setIsEditing(false);
    if (nextValue === value) {
      return;
    }

    setOptimisticValue(nextValue);
    setIsSaving(true);
    try {
      if (import.meta.env.DEV) {
        logger.debug('InlineEditField saving', { type, oldValue: value, newValue: nextValue });
      }
      await onSave(nextValue);
    } catch (error) {
      if (import.meta.env.DEV) {
        logger.error('Error saving field', error);
      }
      setEditValue(value); // Reset to original value on error
    } finally {
      // The parent's refreshed `value` takes over; on failure this reverts the display.
      setOptimisticValue(null);
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    skipBlurSaveRef.current = true;
    setEditValue(value);
    setIsEditing(false);
  };

  const handleBlur = () => {
    if (skipBlurSaveRef.current) {
      skipBlurSaveRef.current = false;
      return;
    }
    void commit(editValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const isPlainEnter = e.key === 'Enter' && type !== 'textarea';
    // Enter adds a line in a textarea, so Ctrl/Cmd+Enter saves there.
    const isModifiedEnter = e.key === 'Enter' && (e.metaKey || e.ctrlKey);
    if (isPlainEnter || isModifiedEnter) {
      e.preventDefault();
      skipBlurSaveRef.current = true;
      void commit(editValue);
    } else if (e.key === 'Escape') {
      e.stopPropagation();
      handleCancel();
    }
  };

  // Format display value based on type
  const getDisplayContent = (displayValue: string): React.ReactNode => {
    if (!displayValue) {
      return <EmptyFieldDisplay />;
    }

    if (type === 'select' && selectOptions) {
      const option = selectOptions.find((opt) => opt.value === displayValue);
      return option ? option.label : displayValue;
    }

    if (type === 'date') {
      try {
        const date = new Date(displayValue);
        if (!isNaN(date.getTime())) {
          return formatDate(date);
        }
      } catch (error) {
        logger.error('Error formatting date for display', error);
      }
    }

    return displayValue;
  };

  // A caller-supplied node cannot reflect an unsaved value, so fall back to the
  // plain formatted value while the optimistic save is pending.
  const resolvedDisplayNode =
    optimisticValue !== null
      ? getDisplayContent(optimisticValue)
      : displayNode ?? getDisplayContent(value);

  if (!canEdit) {
    return <span className={className}>{resolvedDisplayNode}</span>;
  }

  const editLabel = editAriaLabel ?? 'Edit';

  if (!isEditing) {
    return (
      // The pencil button is the keyboard/assistive-tech control; clicking anywhere
      // on the row is a pointer shortcut to the same action.
      // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
      <div
        className={cn(
          isMobile ? mobileInlineEditRowClassName : desktopInlineEditRowClassName,
          '-mx-1.5 cursor-pointer rounded-md px-1.5 transition-colors hover:bg-muted/60',
          isSaving && 'opacity-70',
          className,
        )}
        data-inline-edit-row=""
        aria-busy={isSaving || undefined}
        onClick={(event) => {
          const target = event.target as HTMLElement;
          if (target.closest(NESTED_INTERACTIVE_SELECTOR)) return;
          // Let the user select text to copy without dropping into edit mode.
          if (window.getSelection()?.toString()) return;
          startEditing();
        }}
      >
        <span className={cn(isMobile && mobileInlineEditValueClassName, !isMobile && 'min-w-0')}>
          {resolvedDisplayNode}
        </span>
        <Button
          variant="ghost"
          size="sm"
          className={isMobile ? inlineEditIconClassName : desktopHoverEditIconClassName}
          onClick={startEditing}
          aria-label={editLabel}
        >
          <Edit2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {type === 'textarea' ? (
        <Textarea
          ref={textareaRef}
          id={fieldId}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          placeholder={placeholder}
          className="min-h-[60px]"
        />
      ) : usesPills && selectOptions ? (
        // Few options: one tap picks and saves. Escape or clicking away keeps the old value.
        // eslint-disable-next-line jsx-a11y/no-static-element-interactions
        <div
          ref={pillsContainerRef}
          className="min-w-0 max-w-full overflow-x-auto"
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.stopPropagation();
              handleCancel();
            }
          }}
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
              handleCancel();
            }
          }}
        >
          <SegmentedPills
            id={fieldId}
            ariaLabel={editLabel}
            value={editValue}
            onValueChange={(next) => void commit(next)}
            options={selectOptions}
            size={isMobile ? 'lg' : 'md'}
          />
        </div>
      ) : type === 'select' && selectOptions ? (
        <Select
          defaultOpen
          value={editValue}
          onValueChange={(next) => void commit(next)}
          onOpenChange={(open) => {
            if (!open) setIsEditing(false);
          }}
        >
          <SelectTrigger id={fieldId} className="w-full">
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {selectOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <Input
          ref={textInputRef}
          id={fieldId}
          type={type}
          inputMode={type === 'number' ? 'decimal' : undefined}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          placeholder={placeholder}
        />
      )}
    </div>
  );
};

export default InlineEditField;
