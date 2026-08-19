import { forwardRef, type SVGProps } from 'react';

type BulldozerIconProps = SVGProps<SVGSVGElement> & {
  size?: number | string;
  color?: string;
  strokeWidth?: number | string;
};

/**
 * Lucide-style crawler bulldozer. Lucide has no Bulldozer glyph, so this
 * matches the 24×24 stroke, round caps, and currentColor of the other
 * About-section icons.
 */
export const BulldozerIcon = forwardRef<SVGSVGElement, BulldozerIconProps>(
  (
    {
      className,
      color = 'currentColor',
      size = 24,
      strokeWidth = 2,
      ...props
    },
    ref,
  ) => (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
      {...props}
      data-testid="about-rental-bulldozer"
    >
      {/* Crawler tracks */}
      <rect x="2" y="15.5" width="14" height="5.5" rx="2.75" />
      <path d="M5 18.25h8" />
      {/* Chassis */}
      <path d="M4 15.5V11h8l2 4.5" />
      {/* Cab */}
      <path d="M5.5 11V7.5h4.5L12 11" />
      {/* Exhaust */}
      <path d="M12.5 7.5V4.5h1.5" />
      {/* Push arms */}
      <path d="M14 12.5h4.5" />
      <path d="M14 15h4.5" />
      {/* Blade */}
      <path d="M18.5 6.5c2.6 2.4 2.6 10.6 0 13" />
      <path d="M18.5 6.5h2" />
      <path d="M18.5 19.5h2" />
    </svg>
  ),
);

BulldozerIcon.displayName = 'BulldozerIcon';
