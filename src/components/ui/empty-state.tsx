import React from 'react';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  action,
  className,
}) => {
  return (
    <div className={cn(
      'flex flex-col items-center justify-center py-12 px-4 text-center',
      'gradient-radial-primary rounded-lg animate-empty-state-in',
      className
    )}>
      {Icon && (
        <div className="mb-4 rounded-full bg-primary/10 p-4 shadow-primary">
          <Icon className="h-8 w-8 text-primary" />
        </div>
      )}
      
      <h3 className="font-display text-xl font-semibold text-foreground mb-2">
        {title}
      </h3>
      
      {description && (
        <p className="text-muted-foreground mb-6 max-w-sm leading-relaxed">
          {description}
        </p>
      )}
      
      {action && (
        <div className="flex items-center justify-center">
          {action}
        </div>
      )}
    </div>
  );
};

export default EmptyState;

