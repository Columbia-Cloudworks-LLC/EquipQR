import * as React from 'react';
import { EquipQrMark } from '@/components/landing/EquipQrMark';

interface EquipQRIconProps extends React.SVGProps<SVGSVGElement> {
  /**
   * Accessible label. Defaults to "EquipQR".
   * Pass an empty string when the icon is purely decorative and a
   * parent element already carries a visible label.
   */
  title?: string;
}

/**
 * EquipQR brand icon — the QR scanner mark in brand purple (#7B3EE7).
 *
 * Extracted from public/images/brand/eqr-logo/vector.svg. Uses an inline SVG so:
 * - No network request
 * - Scales to any size via CSS width/height or Tailwind classes
 * - Colour can be overridden by passing fill="currentColor" and setting a
 *   text-colour class on a parent, or by passing explicit `fill` props.
 *
 * Usage:
 *   <EquipQRIcon className="h-8 w-8" />
 *   <EquipQRIcon className="h-6 w-6" title="" aria-hidden />
 */
const EquipQRIcon = React.forwardRef<SVGSVGElement, EquipQRIconProps>(
  ({ title = 'EquipQR', className, ...props }, ref) => {
    // Generate a per-instance id so multiple EquipQRIcon renders on the same
    // page (e.g. <Logo /> in the header AND a hero composite) don't collide
    // on the same `<title>` id and break aria-labelledby for screen readers.
    const reactId = React.useId();
    const titleId = title ? `equipqr-icon-title-${reactId}` : undefined;
    return (
      <svg
        ref={ref}
        viewBox="850 365 222 222"
        xmlns="http://www.w3.org/2000/svg"
        role={title ? 'img' : undefined}
        aria-labelledby={titleId}
        aria-hidden={title ? undefined : true}
        className={className}
        {...props}
      >
        {title && <title id={titleId}>{title}</title>}

        <EquipQrMark />
      </svg>
    );
  },
);

EquipQRIcon.displayName = 'EquipQRIcon';
export default EquipQRIcon;
