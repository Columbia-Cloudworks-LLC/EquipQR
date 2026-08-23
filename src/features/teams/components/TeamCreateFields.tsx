import React, { useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { TeamLocationFormFields } from '@/features/teams/components/TeamLocationFormFields';
import { type PlaceLocationData } from '@/components/ui/GooglePlacesAutocomplete';
import { useGoogleMapsLoader } from '@/hooks/useGoogleMapsLoader';
import { useCustomersByOrg } from '@/features/teams/hooks/useCustomerAccount';
import { TEAM_NATIVE_SELECT_CLASS_NAME } from '@/features/teams/constants/teamNativeSelectClassName';
import type { TeamCreateFieldsValue } from '@/features/teams/utils/teamCreateFields';

export const TEAM_DESCRIPTION_MAX_LENGTH = 500;

interface TeamCreateFieldsProps {
  organizationId: string;
  value: TeamCreateFieldsValue;
  onChange: (value: TeamCreateFieldsValue) => void;
  nameError?: string;
  showCustomerAccount?: boolean;
  showLocation?: boolean;
  idPrefix?: string;
}

export const TeamCreateFields: React.FC<TeamCreateFieldsProps> = ({
  organizationId,
  value,
  onChange,
  nameError,
  showCustomerAccount = true,
  showLocation = true,
  idPrefix = 'team-create',
}) => {
  const { isLoaded } = useGoogleMapsLoader();
  const { data: orgCustomers } = useCustomersByOrg(showCustomerAccount ? organizationId : undefined);

  const patch = useCallback(
    (partial: Partial<TeamCreateFieldsValue>) => onChange({ ...value, ...partial }),
    [onChange, value],
  );

  const handlePlaceSelect = useCallback(
    (data: PlaceLocationData) => patch({ locationData: data }),
    [patch],
  );

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-name`}>Team Name *</Label>
        <Input
          id={`${idPrefix}-name`}
          value={value.name}
          onChange={(e) => patch({ name: e.target.value })}
          placeholder="Enter team name"
          className={nameError ? 'border-destructive focus-visible:ring-destructive' : ''}
          aria-invalid={!!nameError}
          aria-describedby={nameError ? `${idPrefix}-name-error` : undefined}
        />
        {nameError && (
          <p id={`${idPrefix}-name-error`} className="text-sm text-destructive">
            {nameError}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-description`}>Description</Label>
        <Textarea
          id={`${idPrefix}-description`}
          value={value.description}
          onChange={(e) =>
            patch({ description: e.target.value.slice(0, TEAM_DESCRIPTION_MAX_LENGTH) })
          }
          placeholder="Enter team description (optional)"
          rows={3}
          maxLength={TEAM_DESCRIPTION_MAX_LENGTH}
        />
        <p className="text-xs text-muted-foreground text-right">
          {value.description.length} / {TEAM_DESCRIPTION_MAX_LENGTH}
        </p>
      </div>

      {showCustomerAccount && (
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-customer-account`}>Customer Account</Label>
          {value.showNewAccount ? (
            <div className="space-y-2">
              <Input
                value={value.newAccountName}
                onChange={(e) => patch({ newAccountName: e.target.value })}
                placeholder="New account name"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-xs"
                onClick={() => patch({ showNewAccount: false, newAccountName: '' })}
              >
                Cancel new account
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <select
                id={`${idPrefix}-customer-account`}
                className={TEAM_NATIVE_SELECT_CLASS_NAME}
                value={value.selectedCustomerId ?? ''}
                onChange={(e) => patch({ selectedCustomerId: e.target.value || null })}
              >
                <option value="">None (no account)</option>
                {(orgCustomers ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-xs gap-1"
                onClick={() => {
                  patch({
                    showNewAccount: true,
                    newAccountName: value.name.trim(),
                    selectedCustomerId: null,
                  });
                }}
              >
                <Plus className="h-3 w-3" />
                Create new account
              </Button>
            </div>
          )}
        </div>
      )}

      {showLocation && (
        <TeamLocationFormFields
          locationAddress={value.locationData?.formatted_address ?? ''}
          onPlaceSelect={handlePlaceSelect}
          onClear={() => patch({ locationData: null })}
          isLoaded={isLoaded}
        />
      )}
    </div>
  );
};
