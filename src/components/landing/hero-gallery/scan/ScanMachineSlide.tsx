import { EquipQrMark } from '@/components/landing/EquipQrMark';
import type { HeroSlideProps } from '../types';
import { ExcavatorSilhouette } from './ExcavatorSilhouette';
import './scanMachine.css';

const TASKS = [
  { label: 'Grease blade pivots', mark: 'scan-check-a' },
  { label: 'Inspect track tension', mark: 'scan-check-b' },
  { label: 'Replace hydraulic filter', mark: 'scan-check-c' },
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
 * Scan one machine: QR mark becomes an excavator, a phone reads the label on
 * the machine, and that identity opens into a work order and service history.
 * One CSS timeline drives the loop and reports each iteration.
 */
export default function ScanMachineSlide({ onLoopComplete }: HeroSlideProps) {
  return (
    <div
      className="scan-story relative h-full w-full overflow-hidden"
      data-testid="scan-machine-stage"
      onAnimationIteration={onLoopComplete}
    >
      <div className="scan-qr-hero absolute left-1/2 top-1/2 w-[58%] -translate-x-1/2 -translate-y-1/2">
        <svg viewBox="850 365 222 222" aria-hidden="true">
          <EquipQrMark />
        </svg>
      </div>

      <div className="scan-machine absolute inset-x-1 top-[2%] h-[55%] opacity-0">
        <ExcavatorSilhouette />
        <span className="absolute left-[39%] top-[46%] flex h-9 w-9 items-center justify-center rounded border border-primary bg-background shadow-[0_0_0_3px_hsl(var(--background))] sm:h-11 sm:w-11">
          <svg className="h-[80%] w-[80%]" viewBox="850 365 222 222" aria-hidden="true" data-testid="machine-qr-label">
            <EquipQrMark />
          </svg>
        </span>
        <span
          className="scan-pulse pointer-events-none absolute left-[41%] top-[48%] h-8 w-8 rounded-full border border-primary opacity-0"
          aria-hidden="true"
        />
      </div>

      <div
        className="scan-phone absolute right-[1%] top-[12%] w-[19%] opacity-0"
        data-testid="scan-phone"
      >
        <svg viewBox="0 0 80 140" className="w-full" aria-hidden="true">
          <rect
            x="4"
            y="4"
            width="72"
            height="132"
            rx="12"
            fill="hsl(var(--background))"
            stroke="hsl(var(--primary))"
            strokeWidth="3"
          />
          <rect x="12" y="18" width="56" height="96" rx="2" fill="hsl(var(--primary) / 0.12)" />
          <path d="M20 47V32h15 M45 32h15v15 M60 85v15H45 M35 100H20V85" fill="none" stroke="hsl(var(--primary))" strokeWidth="3" strokeLinecap="round" />
          <circle cx="40" cy="66" r="9" fill="none" stroke="hsl(var(--primary))" strokeWidth="2" />
          <circle cx="40" cy="124" r="4" fill="hsl(var(--primary))" />
        </svg>
        <span
          className="scan-beam absolute right-[95%] top-[45%] h-[2px] w-[220%] origin-right rounded-full bg-primary opacity-0"
          aria-hidden="true"
        />
      </div>

      <div className="absolute inset-x-2 bottom-[8%] h-[30%]">
        <div
          className="scan-asset absolute inset-0 flex flex-col justify-center rounded-md border border-primary/50 bg-background/95 px-5 py-3 text-left text-sm leading-snug text-foreground opacity-0 shadow-sm"
          data-testid="scan-asset-card"
        >
          <p className="text-base font-semibold tracking-tight">CAT D6 dozer</p>
          <p className="text-muted-foreground">SN EQ-10482 · 2,846 hrs</p>
          <p className="mt-1 text-muted-foreground">Last service Mar 2 · Open work</p>
        </div>

        <div
          className="scan-work absolute inset-0 flex flex-col justify-center gap-1 rounded-md border border-primary/50 bg-background/95 px-5 py-3 text-left text-sm leading-snug text-foreground opacity-0 shadow-sm"
          data-testid="scan-work-order"
        >
          <p className="font-semibold">Work order · field service</p>
          <ul className="flex flex-col gap-1">
            {TASKS.map((task) => (
              <li key={task.label} className="flex items-center gap-1.5">
                <CheckMark className={task.mark} />
                <span>{task.label}</span>
              </li>
            ))}
          </ul>
        </div>

        <div
          className="scan-history absolute inset-0 flex flex-col justify-center gap-1.5 rounded-md border border-primary/50 bg-background/95 px-5 py-3 text-left text-sm leading-snug text-foreground opacity-0 shadow-sm"
          data-testid="scan-history"
        >
          <p className="text-muted-foreground">Nov 3 · 100-hr service</p>
          <p className="flex items-center gap-1.5 font-medium">
            <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 shrink-0" aria-hidden="true">
              <circle cx="8" cy="5" r="2.4" fill="hsl(var(--primary))" />
              <path d="M3.2 13.2c.6-2.4 2.4-3.6 4.8-3.6s4.2 1.2 4.8 3.6" fill="none" stroke="hsl(var(--primary))" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
            Mar 12 · Alex M. · 250-hr service
          </p>
        </div>
      </div>
    </div>
  );
}
