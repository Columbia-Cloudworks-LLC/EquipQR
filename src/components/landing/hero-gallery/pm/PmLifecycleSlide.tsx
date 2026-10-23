import { EquipQrMark } from '@/components/landing/EquipQrMark';
import type { HeroSlideProps } from '../types';
import { ExcavatorSilhouette } from '../scan/ExcavatorSilhouette';
import './pmLifecycle.css';

const PM_CATEGORIES = [
  { category: 'Fluids / filters', detail: 'Oil & hydraulic filter', mark: 'pm-check-a' },
  { category: 'Grease points', detail: 'Blade & boom pivots', mark: 'pm-check-b' },
  { category: 'Tires / tracks', detail: 'Track tension & idlers', mark: 'pm-check-c' },
  { category: 'Safety / visual', detail: 'Cab ROPS & leak check', mark: 'pm-check-d' },
] as const;

function CheckMark({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 shrink-0" aria-hidden="true">
      <rect
        x="1"
        y="1"
        width="14"
        height="14"
        rx="2"
        fill="none"
        stroke="hsl(var(--primary))"
        strokeWidth="1.5"
      />
      <path
        d="M4 8.2 L7 11 L12 5"
        fill="none"
        stroke="hsl(var(--primary))"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
      />
    </svg>
  );
}

/**
 * Preventive maintenance lifecycle from meter hours to next service (#1563).
 * Shows equipment hours advancing from 2,480 h to the 2,500 h threshold,
 * triggering a PM DUE checklist across four inspection domains, recording
 * technician completion, and scheduling the next interval at 3,000 h.
 */
export default function PmLifecycleSlide({ onLoopComplete }: HeroSlideProps) {
  return (
    <div
      className="pm-story relative h-full w-full overflow-hidden"
      data-testid="pm-lifecycle-stage"
      onAnimationIteration={(event) => {
        if (event.target === event.currentTarget) onLoopComplete();
      }}
    >
      {/* 1. Anchor QR mark that folds into the physical machine */}
      <div className="pm-qr-hero absolute left-1/2 top-1/2 w-[58%]">
        <svg viewBox="850 365 222 222" aria-hidden="true">
          <EquipQrMark />
        </svg>
      </div>

      {/* Physical machine silhouette + QR label */}
      <div className="pm-machine absolute inset-x-1 top-[1%] h-[48%] opacity-0">
        <ExcavatorSilhouette />
        <span className="absolute left-[39%] top-[46%] flex h-9 w-9 items-center justify-center rounded border border-primary bg-background shadow-[0_0_0_3px_hsl(var(--background))] sm:h-11 sm:w-11">
          <svg
            className="h-[80%] w-[80%]"
            viewBox="850 365 222 222"
            aria-hidden="true"
            data-testid="pm-machine-qr-label"
          >
            <EquipQrMark />
          </svg>
        </span>
      </div>

      {/* Live Hour Meter + PM Threshold Ring */}
      <div
        className="pm-meter-panel absolute right-[2%] top-[6%] flex items-center gap-2.5 rounded-md border border-primary/50 bg-background/95 px-3 py-2 opacity-0 shadow-sm"
        data-testid="pm-hour-meter"
      >
        <div className="relative flex h-11 w-11 items-center justify-center">
          <svg viewBox="0 0 48 48" className="h-11 w-11 -rotate-90" aria-hidden="true">
            <circle
              cx="24"
              cy="24"
              r="20"
              fill="none"
              stroke="hsl(var(--primary) / 0.2)"
              strokeWidth="3.5"
            />
            <circle
              cx="24"
              cy="24"
              r="20"
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="3.5"
              strokeLinecap="round"
              className="pm-arc-progress"
            />
          </svg>
          <span className="text-[10px] font-bold text-primary">500h</span>
        </div>

        <div className="flex flex-col text-left leading-tight">
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Hour Meter
          </span>
          <div className="relative h-5 w-16 font-mono text-sm font-bold text-foreground">
            <span className="pm-hours-2480 absolute left-0 top-0">2,480 h</span>
            <span className="pm-hours-2500 absolute left-0 top-0 opacity-0">2,500 h</span>
          </div>
          <span
            className="pm-due-pill mt-0.5 inline-block rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-primary opacity-0"
            data-testid="pm-due-badge"
          >
            PM DUE
          </span>
        </div>
      </div>

      {/* Bottom stage cards: PM Checklist -> Completed + Next Interval */}
      <div className="absolute inset-x-2 bottom-[5%] h-[42%]">
        {/* Stage 3 & 4: PM Inspection Checklist & Field Completion */}
        <div
          className="pm-card-checklist absolute inset-0 flex flex-col justify-between rounded-md border border-primary/50 bg-background/95 px-4 py-2.5 text-left text-xs leading-snug text-foreground opacity-0 shadow-sm sm:px-5 sm:py-3"
          data-testid="pm-checklist-card"
        >
          <div className="flex items-center justify-between gap-2">
            <p className="font-semibold tracking-tight sm:text-sm">
              500-hr PM Checklist · CAT D6 dozer
            </p>
            <span className="rounded bg-primary/15 px-1.5 py-0.5 text-[11px] font-semibold text-primary">
              2,500 h threshold
            </span>
          </div>

          <ul className="grid grid-cols-1 gap-1 sm:grid-cols-2">
            {PM_CATEGORIES.map((item) => (
              <li key={item.category} className="flex items-center gap-1.5">
                <CheckMark className={item.mark} />
                <span>
                  <strong className="font-medium">{item.category}:</strong>{' '}
                  <span className="text-muted-foreground">{item.detail}</span>
                </span>
              </li>
            ))}
          </ul>

          <div
            className="pm-tech-evidence flex items-center justify-between border-t border-border/60 pt-1 text-[11px] text-muted-foreground opacity-0"
            data-testid="pm-technician-evidence"
          >
            <span className="font-medium text-primary">
              Alex M. · Grease schematic &amp; filter photo logged
            </span>
            <span>SN EQ-10482</span>
          </div>
        </div>

        {/* Stage 5 & 6: PM Closed -> Service History + Next Interval Scheduled */}
        <div
          className="pm-card-next absolute inset-0 flex flex-col justify-between rounded-md border border-primary/50 bg-background/95 px-4 py-2.5 text-left text-xs leading-snug text-foreground opacity-0 shadow-sm sm:px-5 sm:py-3 sm:text-sm"
          data-testid="pm-next-interval-card"
        >
          <div className="flex items-center justify-between gap-2">
            <p className="font-semibold tracking-tight">
              500-hr PM Completed · Service History Recorded
            </p>
            <span className="rounded bg-primary px-1.5 py-0.5 text-[11px] font-semibold text-primary-foreground">
              NEXT: 3,000 h
            </span>
          </div>

          <p className="text-xs text-muted-foreground">
            Logged at 2,500 h by Alex M. · Next 500-hr interval automatically scheduled
          </p>

          {/* Interval arc / timeline from 2,500 h to 3,000 h */}
          <div className="flex items-center gap-3 pt-1">
            <span className="font-mono text-xs font-semibold text-muted-foreground">
              2,500 h
            </span>
            <svg viewBox="0 0 180 24" className="h-5 flex-1" aria-hidden="true">
              <path
                d="M 6 18 Q 90 2 174 18"
                fill="none"
                stroke="hsl(var(--primary) / 0.25)"
                strokeWidth="2.5"
              />
              <path
                d="M 6 18 Q 90 2 174 18"
                fill="none"
                stroke="hsl(var(--primary))"
                strokeWidth="2.5"
                strokeLinecap="round"
                className="pm-next-arc"
              />
              <circle cx="6" cy="18" r="3.5" fill="hsl(var(--primary))" />
              <circle cx="174" cy="18" r="4" fill="hsl(var(--primary))" />
            </svg>
            <span className="font-mono text-xs font-bold text-primary">
              NEXT: 3,000 h
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
