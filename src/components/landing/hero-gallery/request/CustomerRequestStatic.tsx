import { EquipQrMark } from '@/components/landing/EquipQrMark';
import { ExcavatorSilhouette } from '../scan/ExcavatorSilhouette';

/**
 * Reduced-motion frame for the customer QR request story: shows the physical
 * machine with its QR label and the connected Customer → Shop → Technician →
 * Completed workflow in one static diagram.
 */
export function CustomerRequestStatic() {
  return (
    <div
      className="flex h-full w-full flex-col justify-between gap-2 px-3 py-2"
      data-testid="customer-request-static"
    >
      <div className="relative h-[40%] w-full">
        <ExcavatorSilhouette />
        <span className="absolute left-[39%] top-[46%] flex h-8 w-8 items-center justify-center rounded border border-primary bg-background sm:h-10 sm:w-10">
          <svg
            className="h-[80%] w-[80%]"
            viewBox="850 365 222 222"
            aria-hidden="true"
            data-testid="request-static-qr-label"
          >
            <EquipQrMark />
          </svg>
        </span>
      </div>

      <div
        className="flex flex-col gap-2 rounded-md border border-primary/50 bg-background/95 px-4 py-2.5 text-left text-xs leading-snug text-foreground shadow-sm sm:text-sm"
        data-testid="customer-request-static-flow"
      >
        <div className="flex flex-wrap items-center justify-between gap-1 border-b border-border/60 pb-1.5">
          <span className="font-semibold tracking-tight">CAT D6 dozer · SN EQ-10482</span>
          <span className="rounded bg-primary/15 px-1.5 py-0.5 text-[11px] font-semibold text-primary">
            COMPLETED
          </span>
        </div>

        <ol className="grid grid-cols-1 gap-1.5 sm:grid-cols-3" aria-label="Customer request workflow stages">
          <li className="rounded border border-border/70 bg-muted/30 px-2.5 py-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">
              1. Customer · REQUESTED
            </p>
            <p className="font-medium">Hydraulic leak</p>
            <p className="text-muted-foreground">QR scan + photo · Request service</p>
          </li>

          <li className="rounded border border-border/70 bg-muted/30 px-2.5 py-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">
              2. Shop Triage · ASSIGNED
            </p>
            <p className="font-medium">WO #418 · Alex M.</p>
            <p className="text-muted-foreground">Dispatched to field tech</p>
          </li>

          <li className="rounded border border-border/70 bg-muted/30 px-2.5 py-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">
              3. Field Repair · COMPLETED
            </p>
            <p className="font-medium">Hose replaced + photo</p>
            <p className="text-muted-foreground">Customer &amp; asset record updated</p>
          </li>
        </ol>
      </div>
    </div>
  );
}
