import { EquipQrMark } from '@/components/landing/EquipQrMark';
import type { HeroSlideProps } from '../types';
import { ExcavatorSilhouette } from '../scan/ExcavatorSilhouette';
import './customerRequest.css';

const REPAIR_TASKS = [
  { label: 'Replace boom hydraulic hose', mark: 'req-check-a' },
  { label: 'Pressure-test circuit & torque fittings', mark: 'req-check-b' },
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
 * Customer QR request → shop triage → technician → completed job (#1562).
 * Demonstrates how a customer requests service directly from a QR-tagged
 * machine, how the shop triages and assigns the work order to a technician,
 * and how the documented completion flows back to both the customer and the
 * machine's permanent service record.
 */
export default function CustomerRequestSlide({ onLoopComplete }: HeroSlideProps) {
  return (
    <div
      className="req-story relative h-full w-full overflow-hidden"
      data-testid="customer-request-stage"
      onAnimationIteration={(event) => {
        if (event.target === event.currentTarget) onLoopComplete();
      }}
    >
      {/* 1. Anchor QR mark that folds into the physical machine */}
      <div className="req-qr-hero absolute left-1/2 top-1/2 w-[58%]">
        <svg viewBox="850 365 222 222" aria-hidden="true">
          <EquipQrMark />
        </svg>
      </div>

      {/* Physical machine silhouette + QR label */}
      <div className="req-machine absolute inset-x-1 top-[1%] h-[48%] opacity-0">
        <ExcavatorSilhouette />
        <span className="absolute left-[39%] top-[46%] flex h-9 w-9 items-center justify-center rounded border border-primary bg-background shadow-[0_0_0_3px_hsl(var(--background))] sm:h-11 sm:w-11">
          <svg
            className="h-[80%] w-[80%]"
            viewBox="850 365 222 222"
            aria-hidden="true"
            data-testid="request-machine-qr-label"
          >
            <EquipQrMark />
          </svg>
        </span>
        <span
          className="req-pulse pointer-events-none absolute left-[41%] top-[48%] h-8 w-8 rounded-full border border-primary opacity-0"
          aria-hidden="true"
        />
      </div>

      {/* Customer phone scanning the machine */}
      <div
        className="req-phone absolute right-[2%] top-[8%] w-[18%] opacity-0"
        data-testid="request-customer-phone"
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
          <path
            d="M20 47V32h15 M45 32h15v15 M60 85v15H45 M35 100H20V85"
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <circle cx="40" cy="66" r="9" fill="none" stroke="hsl(var(--primary))" strokeWidth="2" />
          <circle cx="40" cy="124" r="4" fill="hsl(var(--primary))" />
        </svg>
        <span
          className="req-beam absolute right-[95%] top-[45%] h-[2px] w-[220%] origin-right rounded-full bg-primary opacity-0"
          aria-hidden="true"
        />
      </div>

      {/* Connected workflow path: Customer -> Shop -> Technician */}
      <div
        className="req-flow-rail absolute inset-x-3 top-[51%] flex items-center justify-between text-[11px] font-medium text-muted-foreground opacity-0"
        data-testid="request-workflow-rail"
      >
        <div className="relative flex w-full items-center justify-between">
          <div className="absolute inset-x-4 top-1/2 h-[2px] -translate-y-1/2 bg-primary/30" />
          <div className="req-packet pointer-events-none absolute inset-x-4 top-1/2 -translate-y-1/2 opacity-0">
            <span className="block h-2.5 w-2.5 rounded-full bg-primary shadow-[0_0_8px_hsl(var(--primary))]" />
          </div>

          <span className="relative z-10 flex items-center gap-1 rounded border border-primary/40 bg-background px-2 py-0.5 text-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            Customer QR
          </span>
          <span className="relative z-10 flex items-center gap-1 rounded border border-primary/40 bg-background px-2 py-0.5 text-foreground">
            <span className="h-2 w-2 rotate-45 border border-primary bg-primary/20" />
            Shop Triage
          </span>
          <span className="relative z-10 flex items-center gap-1 rounded border border-primary/40 bg-background px-2 py-0.5 text-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            Field Tech
          </span>
        </div>
      </div>

      {/* Stage cards along bottom */}
      <div className="absolute inset-x-2 bottom-[5%] h-[36%]">
        {/* Stage 2: Public Customer Service Request Card */}
        <div
          className="req-card-request absolute inset-0 flex flex-col justify-between rounded-md border border-primary/50 bg-background/95 px-4 py-2.5 text-left text-xs leading-snug text-foreground opacity-0 shadow-sm sm:px-5 sm:py-3 sm:text-sm"
          data-testid="customer-request-card"
        >
          <div className="flex items-center justify-between gap-2">
            <p className="font-semibold tracking-tight">CAT D6 dozer · SN EQ-10482</p>
            <span className="rounded bg-primary/15 px-1.5 py-0.5 text-[11px] font-semibold text-primary">
              REQUESTED
            </span>
          </div>
          <p className="text-foreground">Issue: Hydraulic leak on boom cylinder</p>
          <div className="flex items-center justify-between gap-2 pt-0.5 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 text-primary" aria-hidden="true">
                <rect x="1.5" y="3.5" width="13" height="10" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
                <circle cx="8" cy="8.5" r="2.2" fill="none" stroke="currentColor" strokeWidth="1.4" />
              </svg>
              1 photo attached
            </span>
            <span className="rounded bg-primary px-2 py-0.5 font-semibold text-primary-foreground">
              Request service
            </span>
          </div>
        </div>

        {/* Stage 3 & 4: Shop Triage & Assignment Card */}
        <div
          className="req-card-triage absolute inset-0 flex flex-col justify-between rounded-md border border-primary/50 bg-background/95 px-4 py-2.5 text-left text-xs leading-snug text-foreground opacity-0 shadow-sm sm:px-5 sm:py-3 sm:text-sm"
          data-testid="shop-triage-card"
        >
          <div className="flex items-center justify-between gap-2">
            <p className="font-semibold tracking-tight">
              Work Order #418 · CAT D6 dozer
            </p>
            <div className="relative h-5 w-20 text-right">
              <span className="req-status-new absolute right-0 top-0 rounded border border-primary/40 bg-muted px-1.5 py-0.5 text-[11px] font-semibold text-foreground">
                NEW
              </span>
              <span className="req-status-assigned absolute right-0 top-0 rounded bg-primary/15 px-1.5 py-0.5 text-[11px] font-semibold text-primary opacity-0">
                ASSIGNED
              </span>
            </div>
          </div>
          <p className="text-muted-foreground">
            Reported via QR: Hydraulic leak on boom cylinder
          </p>
          <div
            className="req-tech-badge flex items-center justify-between rounded border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-medium opacity-0"
            data-testid="assigned-technician-token"
          >
            <span className="flex items-center gap-1.5">
              <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 text-primary" aria-hidden="true">
                <circle cx="8" cy="5" r="2.4" fill="currentColor" />
                <path
                  d="M3.2 13.2c.6-2.4 2.4-3.6 4.8-3.6s4.2 1.2 4.8 3.6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                />
              </svg>
              Assigned to Alex M. · Field Technician
            </span>
            <span className="text-[11px] text-primary">Dispatched</span>
          </div>
        </div>

        {/* Stage 5: Technician Performs Work */}
        <div
          className="req-card-work absolute inset-0 flex flex-col justify-between rounded-md border border-primary/50 bg-background/95 px-4 py-2.5 text-left text-xs leading-snug text-foreground opacity-0 shadow-sm sm:px-5 sm:py-3 sm:text-sm"
          data-testid="technician-work-card"
        >
          <div className="flex items-center justify-between gap-2">
            <p className="font-semibold tracking-tight">Alex M. · CAT D6 dozer</p>
            <span className="rounded bg-primary/15 px-1.5 py-0.5 text-[11px] font-semibold text-primary">
              IN PROGRESS
            </span>
          </div>
          <ul className="flex flex-col gap-1">
            {REPAIR_TASKS.map((task) => (
              <li key={task.label} className="flex items-center gap-1.5">
                <CheckMark className={task.mark} />
                <span>{task.label}</span>
              </li>
            ))}
          </ul>
          <div
            className="req-evidence-pill flex items-center justify-between text-xs text-muted-foreground opacity-0"
            data-testid="technician-evidence-cue"
          >
            <span className="font-medium text-primary">
              + Repair photo &amp; pressure note logged
            </span>
            <span>SN EQ-10482</span>
          </div>
        </div>

        {/* Stage 6: Closeout & Customer Update */}
        <div
          className="req-card-complete absolute inset-0 flex flex-col justify-between rounded-md border border-primary/50 bg-background/95 px-4 py-2.5 text-left text-xs leading-snug text-foreground opacity-0 shadow-sm sm:px-5 sm:py-3 sm:text-sm"
          data-testid="request-closeout-card"
        >
          <div className="flex items-center justify-between gap-2">
            <p className="font-semibold tracking-tight">
              CAT D6 dozer · SN EQ-10482
            </p>
            <span className="rounded bg-primary px-1.5 py-0.5 text-[11px] font-semibold text-primary-foreground">
              COMPLETED
            </span>
          </div>
          <p className="text-foreground">
            WO #418 closed by Alex M. · Boom hose replaced &amp; verified
          </p>
          <p
            className="req-customer-pulse flex items-center gap-1.5 text-xs font-medium text-primary opacity-0"
            data-testid="customer-completion-pulse"
          >
            <span className="h-2 w-2 rounded-full bg-primary" />
            Requester notified · Logged to machine service history
          </p>
        </div>
      </div>
    </div>
  );
}
