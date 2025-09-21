import React from 'react';
import { cn } from '@/lib/utils';

interface PageProps {
  children: React.ReactNode;
  className?: string;
  /**
   * Maximum width of the page content
   * @default "7xl" (1280px)
   */
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | '7xl' | 'full';
  /**
   * Padding variant for consistent spacing
   * @default "responsive" - uses responsive padding that matches App.tsx
   */
  padding?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'responsive';
  /**
   * Whether to center the content horizontally
   * @default true
   */
  centered?: boolean;
}

const Page: React.FC<PageProps> = ({
  children,
  className,
  maxWidth = '7xl',
  padding = 'responsive',
  centered = true,
}) => {
  const paddingClasses = {
    none: '',
    xs: 'p-content-xs',
    sm: 'p-content-sm',
    md: 'p-content',
    lg: 'p-content-lg',
    responsive: 'p-3 sm:p-4 lg:p-6 xl:p-8',
  };

  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
    '5xl': 'max-w-5xl',
    '6xl': 'max-w-6xl',
    '7xl': 'max-w-7xl',
    full: 'max-w-full',
  };

  return (
    <div
      className={cn(
        'w-full',
        paddingClasses[padding],
        centered && 'mx-auto',
        maxWidthClasses[maxWidth],
        className
      )}
    >
      {children}
    </div>
  );
};

export default Page;

