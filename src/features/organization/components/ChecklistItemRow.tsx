import React, { memo, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronRight,
  Copy,
  GripVertical,
  HelpCircle,
  MoreVertical,
  Trash2,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PMChecklistItem } from '@/features/pm-templates/services/preventativeMaintenanceService';
import { cn } from '@/lib/utils';
import type { ChecklistItemRowCallbacks } from '@/features/organization/components/checklistItemRowCallbacks';

export interface ChecklistItemRowProps extends ChecklistItemRowCallbacks {
  item: PMChecklistItem;
  focusOnMount?: boolean;
  index: number;
  totalInSection: number;
  sections: string[];
  compactOnly?: boolean;
  enableDragReorder?: boolean;
  isDragging?: boolean;
  isDragOver?: boolean;
  onDragHandleStart?: (itemId: string) => (event: React.DragEvent<HTMLButtonElement>) => void;
  onItemDragOver?: (itemId: string) => (event: React.DragEvent<HTMLDivElement>) => void;
  onItemDrop?: (itemId: string) => (event: React.DragEvent<HTMLDivElement>) => void;
  onItemDragEnd?: () => void;
}

export const ChecklistItemRow = memo(function ChecklistItemRow({
  item,
  focusOnMount,
  index,
  totalInSection,
  sections,
  onCommit,
  onDuplicate,
  onMoveToSection,
  onMoveToTop,
  onMoveToBottom,
  onDelete,
  onAddBelow,
  triggerAutoSave,
  compactOnly = false,
  enableDragReorder = false,
  isDragging = false,
  isDragOver = false,
  onDragHandleStart,
  onItemDragOver,
  onItemDrop,
  onItemDragEnd,
}: ChecklistItemRowProps) {
  const titleRef = useRef<HTMLInputElement>(null);
  const [titleInput, setTitleInput] = useState(item.title);
  const [descInput, setDescInput] = useState(item.description || '');
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    setTitleInput(item.title);
    setDescInput(item.description || '');
  }, [item.id, item.title, item.description]);

  useEffect(() => {
    if (focusOnMount && titleRef.current) {
      titleRef.current.focus();
      titleRef.current.select();
    }
  }, [focusOnMount]);

  const commitTitle = () => {
    if (titleInput !== item.title) {
      onCommit(item.id, { title: titleInput });
      triggerAutoSave('text');
    }
  };

  const handleDescBlur = () => {
    if ((item.description || '') !== descInput) {
      onCommit(item.id, { description: descInput });
      triggerAutoSave('text');
    }
  };

  const handleRequiredChange = (checked: boolean | 'indeterminate') => {
    const value = checked === true;
    if (value !== item.required) {
      onCommit(item.id, { required: value });
      triggerAutoSave('selection');
    }
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitTitle();
      onAddBelow(item.id);
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      setTitleInput(item.title);
      setExpanded(false);
      titleRef.current?.blur();
    }
  };

  const showExpanded = !compactOnly && expanded;
  const hasDescription = Boolean(descInput.trim());
  const showDescriptionPreview = !compactOnly && !showExpanded && hasDescription;
  const checkLabel = titleInput.trim() || item.title.trim() || 'check';

  const requiredControl = (
    <TooltipProvider delayDuration={300}>
      <div className="flex items-center gap-2">
        <Checkbox
          id={`required-${item.id}`}
          checked={item.required}
          onCheckedChange={handleRequiredChange}
          aria-describedby={`required-help-${item.id}`}
        />
        <Label htmlFor={`required-${item.id}`} className="text-xs font-medium cursor-pointer">
          Required
        </Label>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0"
              aria-label={`Required check help for ${checkLabel}`}
            >
              <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <p id={`required-help-${item.id}`}>
              When enabled, technicians must complete this check on the work order. It cannot be skipped.
            </p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );

  const actionsMenu = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" aria-label={`Actions for ${checkLabel}`}>
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {!compactOnly && (
          <DropdownMenuItem onClick={() => setExpanded((v) => !v)}>
            {expanded ? 'Collapse details' : 'Expand details'}
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={() => onDuplicate(item.id)}>
          <Copy className="mr-2 h-3 w-3" />
          Duplicate
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onMoveToTop(item.id)} disabled={index === 0}>
          <ArrowUp className="mr-2 h-3 w-3" />
          Move to top
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onMoveToBottom(item.id)} disabled={index === totalInSection - 1}>
          <ArrowDown className="mr-2 h-3 w-3" />
          Move to bottom
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => onDelete(item.id)} className="text-destructive focus:text-destructive">
          <Trash2 className="mr-2 h-3 w-3" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div
      className={cn(
        'border rounded-md transition-colors',
        'p-3',
        isDragging && 'opacity-50',
        isDragOver && 'border-primary ring-1 ring-primary/40',
      )}
      data-item-id={item.id}
      onDragOver={onItemDragOver?.(item.id)}
      onDrop={onItemDrop?.(item.id)}
      onDragEnd={onItemDragEnd}
    >
      <div className="flex gap-2">
        <div className="flex shrink-0 flex-col items-center gap-0.5 pt-0.5">
          {enableDragReorder && onDragHandleStart ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 cursor-grab text-muted-foreground active:cursor-grabbing"
              draggable
              onDragStart={onDragHandleStart(item.id)}
              aria-label={`Drag to reorder ${checkLabel}`}
            >
              <GripVertical className="h-4 w-4" aria-hidden />
            </Button>
          ) : null}
          {!compactOnly && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setExpanded((v) => !v)}
              aria-expanded={showExpanded}
              aria-label={
                showExpanded ? `Collapse description for ${checkLabel}` : `Expand description for ${checkLabel}`
              }
            >
              {showExpanded ? (
                <ChevronDown className="h-4 w-4" aria-hidden />
              ) : (
                <ChevronRight className="h-4 w-4" aria-hidden />
              )}
            </Button>
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-start gap-2">
            <Input
              ref={titleRef}
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
              onBlur={commitTitle}
              onKeyDown={handleTitleKeyDown}
              placeholder="Check name"
              className={cn('min-w-0 flex-1', compactOnly ? 'h-8' : 'h-9')}
              aria-label="Check name"
            />
            {actionsMenu}
          </div>

          {requiredControl}

          {showDescriptionPreview && (
            <button
              type="button"
              className="line-clamp-2 w-full text-left text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setExpanded(true)}
            >
              {descInput}
            </button>
          )}

          {showExpanded && (
            <div className="space-y-3 border-t border-border/60 pt-3">
              <div>
                <Label className="text-xs">Description (Optional)</Label>
                <Textarea
                  value={descInput}
                  onChange={(e) => setDescInput(e.target.value)}
                  onBlur={handleDescBlur}
                  placeholder="Instructions for technicians"
                  className="mt-1 resize-none"
                  rows={3}
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Label className="text-xs">Move to section</Label>
                <Select onValueChange={(v) => onMoveToSection(item.id, v)} value={item.section}>
                  <SelectTrigger className="h-8 w-full max-w-md">
                    <SelectValue placeholder="Section" />
                  </SelectTrigger>
                  <SelectContent>
                    {sections.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
