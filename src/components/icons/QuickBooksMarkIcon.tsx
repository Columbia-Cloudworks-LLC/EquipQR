import { cn } from '@/lib/utils';

type IconProps = {
  className?: string;
};

/** QuickBooks product mark (green circle with qb). */
export function QuickBooksMarkIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={cn('h-6 w-6 shrink-0', className)}
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="12" cy="12" r="12" fill="#2CA01C" />
      <text
        x="12"
        y="15.5"
        textAnchor="middle"
        fill="#FFFFFF"
        fontSize="9.5"
        fontWeight="700"
        fontFamily="system-ui, -apple-system, Segoe UI, sans-serif"
      >
        qb
      </text>
    </svg>
  );
}
