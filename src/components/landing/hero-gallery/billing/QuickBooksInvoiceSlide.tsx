import { EquipQrMark } from '@/components/landing/EquipQrMark';
import type { HeroSlideProps } from '../types';
import { ExcavatorSilhouette } from '../scan/ExcavatorSilhouette';
import './quickBooksInvoice.css';

const FIELD_TASKS = [
  { label: 'Replace hydraulic hose & filter kit', mark: 'qb-check-a' },
  { label: 'Complete 2.5 hr field repair & pressure test', mark: 'qb-check-b' },
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
 * Completed work order → reviewed charges → QuickBooks draft invoice (#1564).
 * Begins at the QR-tagged machine as the technician finishes a work order,
 * transforms the completed record into structured labor/parts/service line
 * items for human office review, and hands off a traceable QuickBooks draft
 * invoice without retyping.
 */
export default function QuickBooksInvoiceSlide({ onLoopComplete }: HeroSlideProps) {
  return (
    <div
      className="qb-story relative h-full w-full overflow-hidden"
      data-testid="quickbooks-invoice-stage"
      onAnimationIteration={(event) => {
        if (event.target === event.currentTarget) onLoopComplete();
      }}
    >
      {/* 1. Anchor QR mark that folds into the physical machine */}
      <div className="qb-qr-hero absolute left-1/2 top-1/2 w-[58%]">
        <svg viewBox="850 365 222 222" aria-hidden="true">
          <EquipQrMark />
        </svg>
      </div>

      {/* Physical machine silhouette + QR label */}
      <div className="qb-machine absolute inset-x-1 top-[1%] h-[48%] opacity-0">
        <ExcavatorSilhouette />
        <span className="absolute left-[39%] top-[46%] flex h-9 w-9 items-center justify-center rounded border border-primary bg-background shadow-[0_0_0_3px_hsl(var(--background))] sm:h-11 sm:w-11">
          <svg
            className="h-[80%] w-[80%]"
            viewBox="850 365 222 222"
            aria-hidden="true"
            data-testid="billing-machine-qr-label"
          >
            <EquipQrMark />
          </svg>
        </span>
      </div>

      {/* Integration connector rail: Field Work -> Office Review -> QuickBooks */}
      <div
        className="qb-connector-rail absolute inset-x-3 top-[50%] flex items-center justify-between text-[11px] font-medium text-muted-foreground opacity-0"
        data-testid="billing-connector-rail"
      >
        <div className="relative flex w-full items-center justify-between">
          <div className="absolute inset-x-4 top-1/2 h-[2px] -translate-y-1/2 bg-primary/30" />
          <div className="qb-packet pointer-events-none absolute inset-x-4 top-1/2 -translate-y-1/2 opacity-0">
            <span className="block h-2.5 w-2.5 rounded-full bg-primary shadow-[0_0_8px_hsl(var(--primary))]" />
          </div>

          <span className="relative z-10 flex items-center gap-1 rounded border border-primary/40 bg-background px-2 py-0.5 text-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            WO #418
          </span>
          <span className="relative z-10 flex items-center gap-1 rounded border border-primary/40 bg-background px-2 py-0.5 text-foreground">
            <span className="h-2 w-2 rotate-45 border border-primary bg-primary/20" />
            Office Review
          </span>
          <span className="relative z-10 flex items-center gap-1 rounded border border-primary/40 bg-background px-2 py-0.5 text-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            QuickBooks
          </span>
        </div>
      </div>

      {/* Stage cards along bottom */}
      <div className="absolute inset-x-2 bottom-[5%] h-[38%]">
        {/* Stage 1: Field Work Order Completed at the Machine */}
        <div
          className="qb-card-field absolute inset-0 flex flex-col justify-between rounded-md border border-primary/50 bg-background/95 px-4 py-2.5 text-left text-xs leading-snug text-foreground opacity-0 shadow-sm sm:px-5 sm:py-3 sm:text-sm"
          data-testid="billing-field-work-card"
        >
          <div className="flex items-center justify-between gap-2">
            <p className="font-semibold tracking-tight">
              WO #418 · CAT D6 dozer (SN EQ-10482)
            </p>
            <span className="rounded bg-primary/15 px-1.5 py-0.5 text-[11px] font-semibold text-primary">
              COMPLETED
            </span>
          </div>

          <ul className="flex flex-col gap-1">
            {FIELD_TASKS.map((task) => (
              <li key={task.label} className="flex items-center gap-1.5">
                <CheckMark className={task.mark} />
                <span>{task.label}</span>
              </li>
            ))}
          </ul>

          <p className="text-xs text-muted-foreground">
            Logged by Alex M. · Ready for office charge review
          </p>
        </div>

        {/* Stage 2 & 3: Structured Billable Charges & Human Office Review */}
        <div
          className="qb-card-review absolute inset-0 flex flex-col justify-between rounded-md border border-primary/50 bg-background/95 px-4 py-2.5 text-left text-xs leading-snug text-foreground opacity-0 shadow-sm sm:px-5 sm:py-3"
          data-testid="billing-office-review-card"
        >
          <div className="flex items-center justify-between gap-2">
            <p className="font-semibold tracking-tight sm:text-sm">
              Office Charge Review · WO #418
            </p>
            <span className="font-mono text-xs font-bold text-foreground">
              Total $660.00
            </span>
          </div>

          <div className="grid grid-cols-3 gap-1.5 text-[11px]">
            <div className="rounded border border-border/70 bg-muted/30 px-2 py-1">
              <span className="block font-semibold text-foreground">Labor</span>
              <span className="text-muted-foreground">2.5 hrs · $350</span>
            </div>
            <div className="rounded border border-border/70 bg-muted/30 px-2 py-1">
              <span className="block font-semibold text-foreground">Parts</span>
              <span className="text-muted-foreground">Hose kit · $265</span>
            </div>
            <div className="rounded border border-border/70 bg-muted/30 px-2 py-1">
              <span className="block font-semibold text-foreground">Service</span>
              <span className="text-muted-foreground">Supplies · $45</span>
            </div>
          </div>

          <div
            className="qb-approval-badge flex items-center justify-between rounded border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary opacity-0"
            data-testid="billing-office-approval"
          >
            <span>Reviewed &amp; approved by office manager</span>
            <span>Export to QuickBooks →</span>
          </div>
        </div>

        {/* Stage 4 & 5: QuickBooks Draft Invoice Created with Work Order Traceability */}
        <div
          className="qb-card-invoice absolute inset-0 flex flex-col justify-between rounded-md border border-primary/50 bg-background/95 px-4 py-2.5 text-left text-xs leading-snug text-foreground opacity-0 shadow-sm sm:px-5 sm:py-3 sm:text-sm"
          data-testid="quickbooks-draft-invoice-card"
        >
          <div className="flex items-center justify-between gap-2">
            <p className="font-semibold tracking-tight">
              QuickBooks draft invoice · #INV-2048
            </p>
            <span className="rounded bg-primary px-1.5 py-0.5 text-[11px] font-semibold text-primary-foreground">
              DRAFT READY
            </span>
          </div>

          <div className="flex items-center justify-between text-xs text-foreground">
            <span>Labor $350 · Parts $265 · Service $45</span>
            <span className="font-mono font-bold">$660.00</span>
          </div>

          <p
            className="qb-trace-link flex items-center gap-1.5 text-xs font-medium text-primary opacity-0"
            data-testid="billing-traceability-link"
          >
            <span className="h-2 w-2 rounded-full bg-primary" />
            Traceable to EquipQR WO #418 · CAT D6 dozer (SN EQ-10482)
          </p>
        </div>
      </div>
    </div>
  );
}
