import type { ButtonProps } from '@/components/ui/button';

export type WorkOrderSheetQuickActionTone =
  | 'primary'
  | 'success'
  | 'warning'
  | 'capture'
  | 'utility';

const QUICK_ACTION_ROW = 'h-12 w-full justify-start gap-2 min-h-[44px]';

export function getWorkOrderSheetQuickActionButtonProps(tone: WorkOrderSheetQuickActionTone): {
  variant: NonNullable<ButtonProps['variant']>;
  className: string;
} {
  switch (tone) {
    case 'primary':
      return {
        variant: 'default',
        className: `${QUICK_ACTION_ROW} text-base font-semibold shadow-elevation-1`,
      };
    case 'success':
      return {
        variant: 'default',
        className: `${QUICK_ACTION_ROW} bg-success text-success-foreground hover:bg-success/90 text-base font-semibold shadow-elevation-1`,
      };
    case 'warning':
      return {
        variant: 'outline',
        className: `${QUICK_ACTION_ROW} border-warning/50 bg-warning/10 text-warning hover:bg-warning/15 hover:text-warning`,
      };
    case 'capture':
      return {
        variant: 'secondary',
        className: QUICK_ACTION_ROW,
      };
    case 'utility':
      return {
        variant: 'outline',
        className: `${QUICK_ACTION_ROW} border-border/60 bg-muted/25 text-muted-foreground hover:bg-muted/45 hover:text-foreground`,
      };
  }
}

export function groupWorkOrderSheetQuickActions<
  T extends { tone: WorkOrderSheetQuickActionTone },
>(actions: T[]) {
  return {
    workflow: actions.filter((action) =>
      action.tone === 'primary' || action.tone === 'success' || action.tone === 'warning',
    ),
    capture: actions.filter((action) => action.tone === 'capture'),
    utility: actions.filter((action) => action.tone === 'utility'),
  };
}
