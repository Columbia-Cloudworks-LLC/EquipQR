import { MapPin } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

type GooglePlacesLoadingInputProps = {
  className?: string;
  inputValue: string;
  placeholder: string;
};

export function GooglePlacesLoadingInput({
  className,
  inputValue,
  placeholder,
}: GooglePlacesLoadingInputProps) {
  return (
    <div className={cn('relative', className)}>
      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        value={inputValue}
        placeholder={placeholder}
        disabled
        className="pl-9"
      />
    </div>
  );
}
