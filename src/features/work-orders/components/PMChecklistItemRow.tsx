import React from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { CheckCircle, Circle, MessageSquare, MessageSquareText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PMChecklistItem } from '@/features/pm-templates/services/preventativeMaintenanceService';

const CONDITION_RATINGS = [
  { value: 1, label: 'OK', color: 'text-success' },
  { value: 2, label: 'Adjusted', color: 'text-warning' },
  { value: 3, label: 'Recommend Repairs', color: 'text-warning' },
  { value: 4, label: 'Requires Immediate Repairs', color: 'text-destructive' },
  { value: 5, label: 'Unsafe Condition Present', color: 'text-destructive' },
] as const;

function getConditionColor(condition: number | null | undefined): string {
  if (condition === null || condition === undefined) return 'text-destructive';
  switch (condition) {
    case 1: return 'text-success';
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
    case 2: return 'Adjusted';
    case 3: return 'Recommend Repairs';
    case 4: return 'Requires Immediate Repairs';
    case 5: return 'Unsafe Condition Present';
    default: return 'Unknown';
  }
}

function isItemComplete(item: PMChecklistItem): boolean {
  return item.condition !== undefined && item.condition !== null;
}

interface PMChecklistItemRowProps {
  item: PMChecklistItem;
  readOnly: boolean;
  pmStatus: string;
  onConditionChange: (itemId: string, condition: 1 | 2 | 3 | 4 | 5) => void;
  onToggleNotes: (itemId: string) => void;
  showNotes: boolean;
  borderClass: string;
  onNotesChange: (itemId: string, notes: string) => void;
}

const PMChecklistItemRow = React.memo<PMChecklistItemRowProps>(function PMChecklistItemRow({
  item,
  readOnly,
  pmStatus,
  onConditionChange,
  onToggleNotes,
  showNotes,
  borderClass,
  onNotesChange,
}) {
  const editable = !readOnly && pmStatus !== 'completed';

  return (
    <div className={`p-4 border rounded-lg bg-card ${borderClass}`}>
      <div className="space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {isItemComplete(item) ? (
              <CheckCircle className="h-4 w-4 text-success shrink-0" />
            ) : (
              <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
            )}
            <span className="font-medium text-[15px]">{item.title}</span>
          </div>
          <span className={`text-sm font-medium shrink-0 ${getConditionColor(item.condition)}`}>
            {getConditionText(item.condition)}
          </span>
        </div>
        {item.description && (
          <p className="text-sm text-foreground/75 leading-snug">{item.description}</p>
        )}

        {editable && (
          <div className="flex items-start gap-2">
            <div className="flex-1 space-y-2">
              <Label className="text-sm font-medium">Maintenance Assessment:</Label>
              <Select
                value={item.condition?.toString() || ''}
                onValueChange={(value) => {
                  onConditionChange(item.id, parseInt(value, 10) as 1 | 2 | 3 | 4 | 5);
                  if ('vibrate' in navigator) navigator.vibrate(30);
                }}
              >
                <SelectTrigger className="w-full min-h-[44px] touch-manipulation">
                  <SelectValue placeholder="Select assessment..." />
                </SelectTrigger>
                <SelectContent>
                  {CONDITION_RATINGS.map((rating) => (
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
              className="min-h-[44px] min-w-[44px] mt-5 shrink-0 touch-manipulation"
              onClick={() => onToggleNotes(item.id)}
              aria-label={
                showNotes
                  ? 'Hide notes'
                  : item.notes
                    ? 'Show notes'
                    : 'Add notes'
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

        {editable && (
          <div
            className={cn(
              'grid min-h-0 transition-all duration-200 ease-out',
              showNotes ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
            )}
          >
            <div className="overflow-hidden min-h-0">
              <Textarea
                placeholder="Add notes for this item..."
                value={item.notes || ''}
                onChange={(e) => onNotesChange(item.id, e.target.value)}
                className="mt-2"
                rows={2}
              />
            </div>
          </div>
        )}
        {item.notes && (readOnly || pmStatus === 'completed') && (
          <div className="mt-2 p-2.5 bg-muted rounded text-sm text-foreground/90 border border-border/50">
            <strong className="text-foreground">Notes:</strong> {item.notes}
          </div>
        )}
      </div>
    </div>
  );
});

export default PMChecklistItemRow;

