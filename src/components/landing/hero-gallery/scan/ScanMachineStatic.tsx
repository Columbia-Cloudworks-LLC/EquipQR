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
        <svg
          className="absolute left-[46%] top-[38%] w-[16%]"
          viewBox="850 365 222 222"
          aria-hidden="true"
          data-testid="machine-qr-label"
        >
          <EquipQrMark />
        </svg>
      </div>
      <div
        className="w-full max-w-[16rem] rounded-md border border-primary/30 bg-background/80 px-3 py-2 text-left text-[11px] leading-snug text-foreground shadow-sm"
        data-testid="scan-static-record"
      >
        <p className="font-semibold tracking-tight">CAT 320</p>
        <p className="text-muted-foreground">SN EQ-10482 · 2,846 hrs</p>
        <p className="mt-1">Grease boom pins</p>
        <p className="text-muted-foreground">Mar 12 · Alex M. · 250-hr service</p>
      </div>
    </div>
  );
}
