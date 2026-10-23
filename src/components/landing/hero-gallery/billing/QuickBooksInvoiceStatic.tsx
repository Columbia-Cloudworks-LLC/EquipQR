import { EquipQrMark } from '@/components/landing/EquipQrMark';
import { ExcavatorSilhouette } from '../scan/ExcavatorSilhouette';

/**
 * Reduced-motion frame for the QuickBooks draft invoice story (#1564):
 * shows field completion -> reviewed labor/parts charges -> QuickBooks draft
 * invoice with traceability back to the originating work order in one still.
 */
export function QuickBooksInvoiceStatic() {
  return (
    <div
      className="flex h-full w-full flex-col justify-between gap-2 px-3 py-2"
      data-testid="quickbooks-invoice-static"
    >
      <div className="relative h-[40%] w-full">
        <ExcavatorSilhouette />
        <span className="absolute left-[39%] top-[46%] flex h-8 w-8 items-center justify-center rounded border border-primary bg-background sm:h-10 sm:w-10">
          <svg
            className="h-[80%] w-[80%]"
            viewBox="850 365 222 222"
            aria-hidden="true"
            data-testid="billing-static-qr-label"
          >
            <EquipQrMark />
          </svg>
        </span>
      </div>

      <div
        className="flex flex-col gap-2 rounded-md border border-primary/50 bg-background/95 px-4 py-2.5 text-left text-xs leading-snug text-foreground shadow-sm sm:text-sm"
        data-testid="quickbooks-invoice-static-flow"
      >
        <div className="flex flex-wrap items-center justify-between gap-1 border-b border-border/60 pb-1.5">
          <span className="font-semibold tracking-tight">
            CAT D6 dozer · WO #418
          </span>
          <span className="rounded bg-primary/15 px-1.5 py-0.5 text-[11px] font-semibold text-primary">
            QuickBooks draft invoice
          </span>
        </div>

        <ol className="grid grid-cols-1 gap-1.5 sm:grid-cols-3" aria-label="Billing handoff workflow stages">
          <li className="rounded border border-border/70 bg-muted/30 px-2.5 py-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">
              1. Field · COMPLETED
            </p>
            <p className="font-medium">Hose &amp; filter repair</p>
            <p className="text-muted-foreground">Closed by Alex M.</p>
          </li>

          <li className="rounded border border-border/70 bg-muted/30 px-2.5 py-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">
              2. Office Review
            </p>
            <p className="font-medium">Labor $350 · Parts $265</p>
            <p className="text-muted-foreground">Charges approved ($660)</p>
          </li>

          <li className="rounded border border-border/70 bg-muted/30 px-2.5 py-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">
              3. QuickBooks Draft
            </p>
            <p className="font-medium">Draft #INV-2048 ready</p>
            <p className="text-muted-foreground">Linked to WO #418</p>
          </li>
        </ol>
      </div>
    </div>
  );
}
