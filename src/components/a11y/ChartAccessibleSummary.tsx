import React from 'react';
import { cn } from '@/lib/utils';

export interface ChartSummaryItem {
  label: string;
  value: string;
}

interface ChartAccessibleSummaryProps {
  /** Visible title referenced by aria-labelledby on the chart region. */
  title: string;
  items: ChartSummaryItem[];
  className?: string;
  /** Root element id for aria-describedby on chart regions. */
  id?: string;
  /** When true, summary is visually hidden but available to screen readers. */
  srOnly?: boolean;
}

/**
 * Text/table fallback for charts so Recharts visuals have a non-color data path.
 */
export const ChartAccessibleSummary: React.FC<ChartAccessibleSummaryProps> = ({
  title,
  items,
  className,
  id,
  srOnly = false,
}) => {
  const titleId = React.useId();

  return (
    <div
      id={id}
      className={cn(srOnly && 'sr-only', className)}
      aria-labelledby={titleId}
    >
      <p id={titleId} className="text-sm font-medium text-foreground">
        {title}
      </p>
      <ul className="mt-1 space-y-0.5 text-sm text-muted-foreground">
        {items.map((item) => (
          <li key={item.label}>
            <span className="text-foreground">{item.label}:</span> {item.value}
          </li>
        ))}
      </ul>
    </div>
  );
};