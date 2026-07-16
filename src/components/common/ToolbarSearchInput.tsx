import React from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';

type ToolbarSearchInputProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  ariaLabel: string;
  className?: string;
};

export function ToolbarSearchInput({
  value,
  onChange,
  placeholder,
  ariaLabel,
  className = 'max-w-[260px]',
}: ToolbarSearchInputProps) {
  return (
    <div className={`relative flex-1 ${className}`}>
      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
      <Input
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-8 pl-8 text-sm bg-transparent"
        aria-label={ariaLabel}
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          aria-label="Clear search"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
