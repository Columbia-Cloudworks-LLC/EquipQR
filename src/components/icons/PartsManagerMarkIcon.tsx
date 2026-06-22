import { Wrench } from 'lucide-react';
import { cn } from '@/lib/utils';

type IconProps = {
  className?: string;
};

/** Crossed wrenches mark for parts-manager permissions. */
export function PartsManagerMarkIcon({ className }: IconProps) {
  return (
    <span
      className={cn('relative inline-flex h-6 w-6 shrink-0 items-center justify-center', className)}
      aria-hidden="true"
    >
      <Wrench
        className="absolute h-4 w-4 -translate-x-[3px] -rotate-[35deg] text-primary"
        strokeWidth={2.25}
      />
      <Wrench
        className="absolute h-4 w-4 translate-x-[3px] rotate-[35deg] text-primary"
        strokeWidth={2.25}
      />
    </span>
  );
}
