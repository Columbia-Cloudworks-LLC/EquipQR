import React, { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from 'react-router-dom';
import { cn } from "@/lib/utils";

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

export const StatsCard: React.FC<StatsCardProps> = ({
  icon,
  label,
  value,
  sublabel,
  to,
  trend,
  variant = 'default',
  loading = false,
  ariaDescription
}) => {
  const variantClasses = {
    default: '',
    warning: 'border-warning/50 bg-warning/5',
    danger: 'border-destructive/50 bg-destructive/5',
  };

  const content = (
    <Card 
      className={cn(
        "transition-all duration-200",
        variantClasses[variant],
        to && "cursor-pointer hover:shadow-lg hover:border-primary/50 hover:-translate-y-0.5 active:scale-[0.98]"
      )}
      aria-label={ariaDescription}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{label}</CardTitle>
        {loading ? (
          <Skeleton className="h-4 w-4" />
        ) : (
          <div className="text-muted-foreground">{icon}</div>
        )}
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-4 w-24" />
          </div>
        ) : (
          <>
            <div className="text-2xl font-bold" data-testid={`${label.toLowerCase().replace(/\s+/g, '-')}-value`}>
              {value}
            </div>
            {sublabel && (
              <p className="text-xs text-muted-foreground">
                {sublabel}
              </p>
            )}
            {trend && (
              <div className={cn(
                "text-xs flex items-center gap-1 mt-1",
                trend.direction === 'up' && "text-success",
                trend.direction === 'down' && "text-destructive",
                trend.direction === 'flat' && "text-muted-foreground"
              )}>
                <span>
                  {trend.direction === 'up' && '↗'}
                  {trend.direction === 'down' && '↘'}
                  {trend.direction === 'flat' && '→'}
                </span>
                {trend.delta}%
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );

  if (to && !loading) {
    return <Link to={to} className="cursor-pointer">{content}</Link>;
  }

  return content;
};
