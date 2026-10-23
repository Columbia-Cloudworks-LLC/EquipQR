import { EquipQrMark } from '@/components/landing/EquipQrMark';
import { ExcavatorSilhouette } from '../scan/ExcavatorSilhouette';

/**
 * Reduced-motion frame for the preventive maintenance lifecycle story (#1563):
 * presents the machine, current hours, PM-due threshold, completed PM
 * inspection categories, and next scheduled interval in one static composition.
 */
export function PmLifecycleStatic() {
  return (
    <div
      className="flex h-full w-full flex-col justify-between gap-2 px-3 py-2"
      data-testid="pm-lifecycle-static"
    >
      <div className="relative h-[40%] w-full">
        <ExcavatorSilhouette />
        <span className="absolute left-[39%] top-[46%] flex h-8 w-8 items-center justify-center rounded border border-primary bg-background sm:h-10 sm:w-10">
          <svg
            className="h-[80%] w-[80%]"
            viewBox="850 365 222 222"
            aria-hidden="true"
            data-testid="pm-static-qr-label"
          >
            <EquipQrMark />
          </svg>
        </span>
      </div>

      <div
        className="flex flex-col gap-2 rounded-md border border-primary/50 bg-background/95 px-4 py-2.5 text-left text-xs leading-snug text-foreground shadow-sm sm:text-sm"
        data-testid="pm-lifecycle-static-summary"
      >
        <div className="flex flex-wrap items-center justify-between gap-1.5 border-b border-border/60 pb-1.5">
          <span className="font-semibold tracking-tight">CAT D6 dozer · 2,500 h</span>
          <div className="flex items-center gap-1.5">
            <span className="rounded bg-primary/15 px-1.5 py-0.5 text-[11px] font-semibold text-primary">
              PM DUE · 2,500 h
            </span>
            <span className="rounded bg-primary px-1.5 py-0.5 text-[11px] font-semibold text-primary-foreground">
              NEXT: 3,000 h
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-1.5 text-xs">
          <div className="rounded border border-border/70 bg-muted/30 px-2 py-1">
            <span className="font-medium text-foreground">Fluids / filters</span>
            <span className="block text-muted-foreground">Oil &amp; hydraulic filter</span>
          </div>
          <div className="rounded border border-border/70 bg-muted/30 px-2 py-1">
            <span className="font-medium text-foreground">Grease points</span>
            <span className="block text-muted-foreground">Blade &amp; boom pivots</span>
          </div>
          <div className="rounded border border-border/70 bg-muted/30 px-2 py-1">
            <span className="font-medium text-foreground">Tires / tracks</span>
            <span className="block text-muted-foreground">Track tension verified</span>
          </div>
          <div className="rounded border border-border/70 bg-muted/30 px-2 py-1">
            <span className="font-medium text-foreground">Safety / visual</span>
            <span className="block text-muted-foreground">Completed by Alex M.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
