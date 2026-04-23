import * as React from 'react';

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
 * Extracted from public/eqr-logo/vector.svg. Uses an inline SVG so:
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
    const titleId = title ? 'equipqr-icon-title' : undefined;
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

        {/* Top-left QR finder pattern */}
        <path fill="#7B3EE7" d="M915.17,459h-52.99v-77.04h77.04v53.29c1.77-0.76,3.59-1.42,5.46-1.96V376.5h-87.95v87.96h56.39
          C913.67,462.58,914.38,460.77,915.17,459z"/>
        <path fill="#7B3EE7" d="M921.14,449.12c2.39-3.02,5.13-5.73,8.19-8.07v-49.2h-57.27v57.27H921.14z"/>

        {/* Top-right QR finder pattern */}
        <path fill="#7B3EE7" d="M967.46,372.86v59.74c4.53,1,8.81,2.67,12.74,4.9v-51.9h69.76v69.76h-52.07
          c2.18,3.93,3.8,8.21,4.76,12.74h60.04v-95.23H967.46z"/>
        <path fill="#7B3EE7" d="M1037.78,397.77h-45.42v45.42h45.42V397.77z M1030.75,436.16h-31.36V404.8h31.36V436.16z"/>

        {/* Bottom-right QR finder pattern */}
        <path fill="#7B3EE7" d="M999.35,497.25h50.6V567h-69.76v-49.01c-3.93,2.23-8.21,3.9-12.74,4.9v56.85h95.23v-95.23h-59.52
          C1002.51,489,1001.2,493.27,999.35,497.25z"/>
        <path fill="#7B3EE7" d="M989.63,528.26h20.97v-20.97h-17.61c-1.05,1.27-2.18,2.47-3.36,3.62V528.26z"/>
        <rect fill="#7B3EE7" x="1019.55" y="507.29" width="20.97" height="20.97"/>
        <rect fill="#7B3EE7" x="1019.55" y="535.99" width="20.97" height="20.97"/>
        <rect fill="#7B3EE7" x="989.63" y="535.99" width="20.97" height="20.97"/>

        {/* Bottom-left data modules */}
        <rect fill="#7B3EE7" x="914.44" y="547.52" width="27.5" height="27.5"/>
        <path fill="#7B3EE7" d="M914.44,494.89v25.13h24.24C927.67,515.14,918.92,506.11,914.44,494.89z"/>
        <rect fill="#7B3EE7" x="859.45" y="492.52" width="27.5" height="27.5"/>
        <rect fill="#7B3EE7" x="886.94" y="520.02" width="27.5" height="27.5"/>
        <rect fill="#7B3EE7" x="859.45" y="547.52" width="27.5" height="27.5"/>

        {/* Scan / link indicator */}
        <path fill="#7B3EE7" d="M983.82,463.2l-14.92,14.92l-4.34,4.34l-3.37,3.37l-10.54-2.82l-2.82-10.54l3.37-3.37l4.34-4.34
          l14.92-14.92c-9.69-4.31-21.44-2.5-29.38,5.44c-8.08,8.08-9.79,20.09-5.19,29.87l-13,13
          c1.61,2.47,3.49,4.81,5.66,6.97c2.16,2.16,4.5,4.05,6.97,5.66l13-13c9.78,4.6,21.79,2.89,29.87-5.19
          C986.32,484.64,988.13,472.89,983.82,463.2z"/>
      </svg>
    );
  },
);

EquipQRIcon.displayName = 'EquipQRIcon';
export default EquipQRIcon;
