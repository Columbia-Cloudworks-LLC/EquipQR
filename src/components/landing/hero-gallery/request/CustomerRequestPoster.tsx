import { EquipQrMark } from '@/components/landing/EquipQrMark';

/**
 * First frame of the customer request story. Shown while the slide chunk loads
 * so the stage never paints blank.
 */
export function CustomerRequestPoster() {
  return (
    <div
      className="flex h-full w-full items-center justify-center"
      data-testid="customer-request-poster"
    >
      <svg className="w-[58%]" viewBox="850 365 222 222" aria-hidden="true">
        <EquipQrMark />
      </svg>
    </div>
  );
}
