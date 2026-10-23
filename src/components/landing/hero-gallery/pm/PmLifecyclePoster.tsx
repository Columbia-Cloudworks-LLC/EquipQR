import { EquipQrMark } from '@/components/landing/EquipQrMark';

/**
 * First frame of the preventive maintenance story. Shown while the slide chunk
 * loads so the stage never paints blank.
 */
export function PmLifecyclePoster() {
  return (
    <div
      className="flex h-full w-full items-center justify-center"
      data-testid="pm-lifecycle-poster"
    >
      <svg className="w-[58%]" viewBox="850 365 222 222" aria-hidden="true">
        <EquipQrMark />
      </svg>
    </div>
  );
}
