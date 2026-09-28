import { EquipQrMark } from '@/components/landing/EquipQrMark';

/**
 * First frame of the scan story. Shown only while that slide's chunk loads so
 * the stage never paints blank or borrows the fleet map.
 */
export function ScanPoster() {
  return (
    <div
      className="flex h-full w-full items-center justify-center"
      data-testid="scan-machine-poster"
    >
      <svg className="w-[58%]" viewBox="850 365 222 222" aria-hidden="true">
        <EquipQrMark />
      </svg>
    </div>
  );
}
