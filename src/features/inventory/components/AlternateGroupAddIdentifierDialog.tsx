import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlternateGroupResponsiveDialog } from '@/features/inventory/components/AlternateGroupResponsiveDialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { IDENTIFIER_TYPES } from '@/features/inventory/constants/partIdentifierTypes';
import type { PartIdentifierType } from '@/features/inventory/types/inventory';

type AlternateGroupAddIdentifierDialogProps = {
  isMobile: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  identifierType: PartIdentifierType;
  onIdentifierTypeChange: (value: PartIdentifierType) => void;
  identifierValue: string;
  onIdentifierValueChange: (value: string) => void;
  identifierManufacturer: string;
  onIdentifierManufacturerChange: (value: string) => void;
  onCancel: () => void;
  onSubmit: () => void;
  isPending: boolean;
};

function AddIdentifierDialogBody({
  identifierType,
  onIdentifierTypeChange,
  identifierValue,
  onIdentifierValueChange,
  identifierManufacturer,
  onIdentifierManufacturerChange,
  onCancel,
  onSubmit,
  isPending,
}: Omit<AlternateGroupAddIdentifierDialogProps, 'isMobile' | 'open' | 'onOpenChange'>) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="identifier-type">Type</Label>
        <Select
          value={identifierType}
          onValueChange={(value) => onIdentifierTypeChange(value as PartIdentifierType)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {IDENTIFIER_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="identifier-value">
          Part Number <span className="text-destructive">*</span>
        </Label>
        <Input
          id="identifier-value"
          placeholder="e.g., CAT-1R-0750, WIX 51773"
          value={identifierValue}
          onChange={(e) => onIdentifierValueChange(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="identifier-manufacturer">Manufacturer</Label>
        <Input
          id="identifier-manufacturer"
          placeholder="e.g., Caterpillar, WIX, Baldwin"
          value={identifierManufacturer}
          onChange={(e) => onIdentifierManufacturerChange(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Optional. The brand or manufacturer of this part number.
        </p>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={onSubmit} disabled={!identifierValue.trim() || isPending}>
          {isPending ? 'Adding...' : 'Add Part Number'}
        </Button>
      </div>
    </div>
  );
}

export function AlternateGroupAddIdentifierDialog(props: AlternateGroupAddIdentifierDialogProps) {
  const { isMobile, open, onOpenChange } = props;

  return (
    <AlternateGroupResponsiveDialog
      isMobile={isMobile}
      open={open}
      onOpenChange={onOpenChange}
      title="Add Part Number"
      description="Add an OEM, aftermarket, or cross-reference part number to this group."
    >
      <AddIdentifierDialogBody {...props} />
    </AlternateGroupResponsiveDialog>
  );
}
