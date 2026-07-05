import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import type {
  OperatorChecklistAnswer,
  OperatorChecklistTemplateItem,
} from '@/features/operator-check-ins/types/operatorChecklist';
import { cn } from '@/lib/utils';

const SWIPE_THRESHOLD_PX = 50;

function capturePointer(target: HTMLElement, pointerId: number) {
  if (typeof target.setPointerCapture === 'function') {
    target.setPointerCapture(pointerId);
  }
}

function releasePointer(target: HTMLElement, pointerId: number) {
  if (
    typeof target.hasPointerCapture === 'function' &&
    typeof target.releasePointerCapture === 'function' &&
    target.hasPointerCapture(pointerId)
  ) {
    target.releasePointerCapture(pointerId);
  }
}

export type ChecklistItemAnswerStatus = 'unchecked' | 'pass' | 'fail';

export function getChecklistItemAnswerStatus(
  answer: OperatorChecklistAnswer | undefined,
): ChecklistItemAnswerStatus {
  if (answer?.passed === true) return 'pass';
  if (answer?.passed === false) return 'fail';
  return 'unchecked';
}

interface OperatorCheckinChecklistItemRowProps {
  item: OperatorChecklistTemplateItem;
  answer: OperatorChecklistAnswer | undefined;
  onAnswer: (passed: boolean) => void;
}

export function OperatorCheckinChecklistItemRow({
  item,
  answer,
  onAnswer,
}: OperatorCheckinChecklistItemRowProps) {
  const pointerStartX = useRef<number | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const status = getChecklistItemAnswerStatus(answer);

  function resetPointerState() {
    pointerStartX.current = null;
    setDragOffset(0);
  }

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    pointerStartX.current = event.clientX;
    capturePointer(event.currentTarget, event.pointerId);
    setDragOffset(0);
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (pointerStartX.current === null) return;
    const delta = event.clientX - pointerStartX.current;
    setDragOffset(Math.max(-80, Math.min(80, delta)));
  }

  function handlePointerUp(event: React.PointerEvent<HTMLDivElement>) {
    if (pointerStartX.current === null) return;
    const delta = event.clientX - pointerStartX.current;
    if (delta >= SWIPE_THRESHOLD_PX) {
      onAnswer(true);
    } else if (delta <= -SWIPE_THRESHOLD_PX) {
      onAnswer(false);
    }
    resetPointerState();
    releasePointer(event.currentTarget, event.pointerId);
  }

  return (
    <div
      data-testid={`checklist-item-row-${item.id}`}
      className={cn(
        'rounded-lg border p-3 transition-colors touch-manipulation select-none space-y-3',
        status === 'unchecked' && 'border-border/60 bg-card',
        status === 'pass' && 'border-emerald-500/60 bg-emerald-500/10',
        status === 'fail' && 'border-destructive/60 bg-destructive/10',
      )}
      style={dragOffset !== 0 ? { transform: `translateX(${dragOffset}px)` } : undefined}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={resetPointerState}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium">{item.title}</p>
          {item.description && (
            <p className="text-sm text-muted-foreground">{item.description}</p>
          )}
          {item.required && <p className="text-xs text-muted-foreground">Required</p>}
        </div>
        <span
          data-testid={`checklist-item-status-${item.id}`}
          className={cn(
            'shrink-0 rounded-full px-2 py-0.5 text-xs font-medium',
            status === 'unchecked' && 'bg-muted text-muted-foreground',
            status === 'pass' && 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
            status === 'fail' && 'bg-destructive/15 text-destructive',
          )}
        >
          {status === 'pass' ? 'Pass' : status === 'fail' ? 'Fail' : 'Not checked'}
        </span>
      </div>
      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          variant={status === 'pass' ? 'default' : 'outline'}
          className="min-h-[44px] flex-1 touch-manipulation"
          aria-pressed={status === 'pass'}
          aria-label={`Pass: ${item.title}`}
          onClick={() => onAnswer(true)}
        >
          Pass
        </Button>
        <Button
          type="button"
          size="sm"
          variant={status === 'fail' ? 'destructive' : 'outline'}
          className="min-h-[44px] flex-1 touch-manipulation"
          aria-pressed={status === 'fail'}
          aria-label={`Fail: ${item.title}`}
          onClick={() => onAnswer(false)}
        >
          Fail
        </Button>
      </div>
    </div>
  );
}
