import { MapPin } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

type GooglePlacesPlaintextInputProps = {
  className?: string;
  inputValue: string;
  placeholder: string;
  disabled: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur: () => void;
  onEnter: () => void;
};

export function GooglePlacesPlaintextInput({
  className,
  inputValue,
  placeholder,
  disabled,
  onChange,
  onBlur,
  onEnter,
}: GooglePlacesPlaintextInputProps) {
  return (
    <div className={cn('relative', className)}>
      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
      <Input
        value={inputValue}
        onChange={onChange}
        onBlur={onBlur}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onEnter();
        }}
        placeholder={placeholder}
        disabled={disabled}
        className="pl-9"
        autoFocus
      />
    </div>
  );
}
