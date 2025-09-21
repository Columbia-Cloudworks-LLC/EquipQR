import React from 'react';
import { cn } from '@/lib/utils';
import { LucideIcon as LucideIconType } from 'lucide-react';

interface LucideIconProps {
  icon: LucideIconType;
  size?: 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl';
  className?: string;
}

const LucideIcon: React.FC<LucideIconProps> = ({ icon: IconComponent, size = 'base', className }) => {
  const sizeClasses = {
    xs: 'h-3 w-3',
    sm: 'h-4 w-4',
    base: 'h-5 w-5',
    lg: 'h-6 w-6',
    xl: 'h-7 w-7',
    '2xl': 'h-8 w-8',
  };

  return (
    <IconComponent
      className={cn(sizeClasses[size], className)}
      aria-hidden="true"
    />
  );
};

export default LucideIcon;

