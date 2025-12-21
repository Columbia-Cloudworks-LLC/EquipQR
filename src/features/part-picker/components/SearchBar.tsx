import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useId } from 'react';

interface SearchBarProps {
  value: string;
  onChange: (v: string) => void;
  onSubmitTop?: () => void;
}

export default function SearchBar({ value, onChange, onSubmitTop }: SearchBarProps) {
  const id = useId();
  return (
    <div className="w-full max-w-3xl mx-auto">
      <Label htmlFor={id} className="sr-only">Search parts</Label>
      <Input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search by MPN, brand, category..."
        className="h-12 text-base"
        aria-autocomplete="list"
        aria-controls="part-results"
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            onSubmitTop?.();
          }
        }}
      />
    </div>
  );
}
