import React from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

interface SettingsToggleRowProps {
  id: string;
  label: string;
  description?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
}

export const SettingsToggleRow: React.FC<SettingsToggleRowProps> = ({
  id,
  label,
  description,
  checked,
  onCheckedChange,
  disabled = false,
  loading = false,
  icon,
}) => {
  return (
    <div className="flex items-center justify-between rounded-lg border p-4 min-h-[48px]">
      <div className="flex items-center gap-3 pr-4 min-w-0">
        {icon && <div className="shrink-0 text-muted-foreground">{icon}</div>}
        <div className="space-y-0.5">
          <Label htmlFor={id} className="text-sm font-medium leading-none cursor-pointer">
            {label}
          </Label>
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        <Switch
          id={id}
          checked={checked}
          onCheckedChange={onCheckedChange}
          disabled={disabled || loading}
          aria-label={label}
        />
      </div>
    </div>
  );
};
