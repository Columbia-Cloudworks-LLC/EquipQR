import React from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { TeamRole } from '@/types/permissions';

export type TeamRoleSelectOption = {
  value: TeamRole | string;
  label: string;
  description: string;
};

type TeamRoleSelectProps = {
  id?: string;
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  options: TeamRoleSelectOption[];
  required?: boolean;
};

export function TeamRoleSelect({
  id = 'role',
  label,
  value,
  onValueChange,
  options,
  required,
}: TeamRoleSelectProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Select value={value} onValueChange={onValueChange} required={required}>
        <SelectTrigger>
          <SelectValue placeholder="Select a role" />
        </SelectTrigger>
        <SelectContent>
          {options.map((role) => (
            <SelectItem key={role.value} value={role.value}>
              <div>
                <div className="font-medium">{role.label}</div>
                <div className="text-sm text-muted-foreground">{role.description}</div>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
