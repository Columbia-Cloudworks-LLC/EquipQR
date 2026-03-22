import React, { ReactNode, useEffect, useRef, useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from 'react-router-dom';
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

function useCountUp(target: number, durationMs = 300): number {
  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const [displayed, setDisplayed] = useState(prefersReducedMotion ? target : 0);
  const rafRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (prefersReducedMotion) {
      setDisplayed(target);
      return;
    }

    startTimeRef.current = null;

    const animate = (timestamp: number) => {
      if (startTimeRef.current === null) startTimeRef.current = timestamp;
      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / durationMs, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayed(Math.round(eased * target));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [target, durationMs, prefersReducedMotion]);

  return displayed;
}

interface TrendData {
  direction: 'up' | 'down' | 'flat';
  delta: number;
}

interface StatsCardProps {
  icon: ReactNode;
  label: string;
  value: number | string;
  sublabel?: string;
  to?: string;
  trend?: TrendData;
  variant?: 'default' | 'warning' | 'danger';
  loading?: boolean;
  ariaDescription?: string;
}

const variantStyles = {
  default: {
    border: 'border-l-primary',
    text: 'text-primary',
  },
  warning: {
    border: 'border-l-warning',
    text: 'text-warning',
  },
  danger: {
    border: 'border-l-destructive',
    text: 'text-destructive',
  },
};

export const StatsCard: React.FC<StatsCardProps> = ({
  icon,
  label,
  value,
  sublabel,
  to,
  trend,
  variant = 'default',
  loading = false,
  ariaDescription,
}) => {
  const styles = variantStyles[variant];
  const numericValue = typeof value === 'number' ? value : 0;
  const animatedValue = useCountUp(loading ? 0 : numericValue, 300);
  const displayValue = typeof value === 'number' ? animatedValue : value;

  const content = (
    <Card
      className={cn(
        "border-l-[3px] transition-all duration-200",
        styles.border,
        variant === 'warning' && 'bg-warning/5 dark:bg-warning/10',
        variant === 'danger' && 'bg-destructive/5 dark:bg-destructive/10',
        to && "cursor-pointer hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.98]"
      )}
      aria-label={ariaDescription}
    >
      <CardContent className="p-4 pb-5 pt-4 sm:p-5 sm:pb-6 sm:pt-5">
        {loading ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-4 rounded" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-9 w-16" />
            <Skeleton className="h-3 w-20" />
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-2">
              <span className={cn("flex-shrink-0", styles.text)}>{icon}</span>
              <span className="text-[13px] font-medium text-muted-foreground uppercase tracking-wide">
                {label}
              </span>
            </div>
            <div
              className="text-3xl font-bold tracking-tight text-foreground"
              data-testid={`${label.toLowerCase().replace(/\s+/g, '-')}-value`}
            >
              {displayValue}
            </div>
            {sublabel && (
              <p className="mt-1 text-[13px] text-muted-foreground">
                {sublabel}
              </p>
            )}
            {trend && (
              <div className={cn(
                "mt-1.5 flex items-center gap-1 text-xs font-medium",
                trend.direction === 'up' && "text-success",
                trend.direction === 'down' && "text-destructive",
                trend.direction === 'flat' && "text-muted-foreground"
              )}>
                {trend.direction === 'up' && <TrendingUp className="h-3 w-3" aria-hidden />}
                {trend.direction === 'down' && <TrendingDown className="h-3 w-3" aria-hidden />}
                {trend.direction === 'flat' && <Minus className="h-3 w-3" aria-hidden />}
                {trend.delta}% this week
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );

  if (to && !loading) {
    return <Link to={to} className="cursor-pointer block">{content}</Link>;
  }

  return content;
};
