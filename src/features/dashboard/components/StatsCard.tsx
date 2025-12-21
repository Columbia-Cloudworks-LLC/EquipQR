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
  loading = false,
  ariaDescription
}) => {
  const content = (
    <Card 
      className={cn(
        "transition-all duration-200",
        to && "hover:shadow-lg hover:scale-105 cursor-pointer"
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
                trend.direction === 'up' && "text-green-600",
                trend.direction === 'down' && "text-red-600",
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