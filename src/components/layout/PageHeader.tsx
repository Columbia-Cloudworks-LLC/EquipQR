import React from 'react';
import { cn } from '@/lib/utils';
import { ChevronRight } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  title: string;
  description?: string;
  /** Optional meta content (badges, labels) displayed inline with title on desktop, below on mobile */
  meta?: React.ReactNode;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
  className?: string;
}

const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  meta,
  breadcrumbs,
  actions,
  className,
}) => {
  return (
    <div className={cn('space-y-4', className)}>
      {/* Breadcrumbs */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="flex items-center space-x-1 text-sm text-muted-foreground" aria-label="Breadcrumb">
          {breadcrumbs.map((item, index) => (
            <div key={`${item.label}-${index}`} className="flex items-center">
              {index > 0 && (
                <ChevronRight className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
              )}
              {item.href ? (
                <a
                  href={item.href}
                  className="hover:text-foreground transition-colors"
                >
                  {item.label}
                </a>
              ) : (
                <span className="text-foreground font-medium" aria-current="page">
                  {item.label}
                </span>
              )}
            </div>
          ))}
        </nav>
      )}

      {/* Header content - responsive layout: stacks on mobile, side-by-side on larger screens */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1 space-y-1">
          {/* Title row with inline meta on desktop */}
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {title}
            </h1>
            {/* Meta badges/labels - shown inline with title on desktop */}
            {meta && (
              <div className="hidden sm:flex items-center gap-2">
                {meta}
              </div>
            )}
          </div>
          
          {/* Meta badges/labels - shown below title on mobile for better spacing */}
          {meta && (
            <div className="flex items-center gap-2 sm:hidden">
              {meta}
            </div>
          )}
          
          {description && (
            <p className="text-muted-foreground text-base sm:text-lg line-clamp-2">
              {description}
            </p>
          )}
        </div>
        
        {/* Actions - full width on mobile, auto on larger screens */}
        {actions && (
          <div className="flex items-center gap-2 flex-shrink-0">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
};

export default PageHeader;

