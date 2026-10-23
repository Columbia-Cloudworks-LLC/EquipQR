import { EquipQrMark } from '@/components/landing/EquipQrMark';

/**
 * First frame of the QuickBooks draft invoice story. Shown while the slide
 * chunk loads so the stage never paints blank.
 */
export function QuickBooksInvoicePoster() {
  return (
    <div
      className="flex h-full w-full items-center justify-center"
      data-testid="quickbooks-invoice-poster"
    >
      <svg className="w-[58%]" viewBox="850 365 222 222" aria-hidden="true">
        <EquipQrMark />
      </svg>
    </div>
  );
}
