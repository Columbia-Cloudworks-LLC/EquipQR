import { EquipQrMark } from '@/components/landing/EquipQrMark';
import { ExcavatorSilhouette } from './ExcavatorSilhouette';

/**
 * Reduced-motion frame for the scan story: the machine, its QR label, and the
 * identity / work / history states in one still.
 */
export function ScanMachineStatic() {
  return (
    <div
      className="flex h-full w-full flex-col items-center justify-center gap-3 px-4"
      data-testid="scan-machine-static"
    >
      <div className="relative h-[46%] w-full">
        <ExcavatorSilhouette />
        <span className="absolute left-[39%] top-[46%] flex h-9 w-9 items-center justify-center rounded border border-primary bg-background sm:h-11 sm:w-11">
          <svg className="h-[80%] w-[80%]" viewBox="850 365 222 222" aria-hidden="true" data-testid="machine-qr-label">
            <EquipQrMark />
          </svg>
        </span>
      </div>
      <div
        className="w-full rounded-md border border-primary/50 bg-background/95 px-5 py-3 text-left text-sm leading-snug text-foreground shadow-sm"
        data-testid="scan-static-record"
      >
        <p className="font-semibold tracking-tight">CAT D6 dozer</p>
        <p className="text-muted-foreground">SN EQ-10482 · 2,846 hrs</p>
        <p className="mt-1">Grease boom pins</p>
        <p className="text-muted-foreground">Mar 12 · Alex M. · 250-hr service</p>
      </div>
    </div>
  );
}
