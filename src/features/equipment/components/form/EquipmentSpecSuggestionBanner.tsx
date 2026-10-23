import React, { useState } from 'react';
import { Check, Sparkles, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { decodeHighwayVinViaVpic } from '@/features/equipment/services/equipmentSpecInferenceService';
import {
  lookupEpaEngineFamily,
  type EquipmentSpecSuggestion,
} from '@/features/equipment/utils/equipmentTaxonomyInference';
import type { SpecInferenceSource } from '@/features/equipment/data/equipmentTaxonomySeed';

const SOURCE_LABELS: Record<SpecInferenceSource, string> = {
  shop: 'Prior Fleet Unit',
  taxonomy: 'Open Taxonomy',
  vpic: 'NHTSA vPIC',
  epa: 'EPA Cert Data',
};

interface EquipmentSpecSuggestionBannerProps {
  suggestion: EquipmentSpecSuggestion | null;
  serialNumber: string;
  onAcceptSuggestion: (suggestion: EquipmentSpecSuggestion) => void;
  onIgnoreSuggestion: (suggestionKey: string) => void;
  onExternalSuggestionResolved: (suggestion: EquipmentSpecSuggestion) => void;
}

export const EquipmentSpecSuggestionBanner: React.FC<
  EquipmentSpecSuggestionBannerProps
> = ({
  suggestion,
  serialNumber,
  onAcceptSuggestion,
  onIgnoreSuggestion,
  onExternalSuggestionResolved,
}) => {
  const [showEnrichTools, setShowEnrichTools] = useState(false);
  const [epaFamilyInput, setEpaFamilyInput] = useState('');
  const [lookupStatusMessage, setLookupStatusMessage] = useState<string | null>(null);
  const [isLookingUpVin, setIsLookingUpVin] = useState(false);

  const handleDecodeVin = async () => {
    setIsLookingUpVin(true);
    setLookupStatusMessage(null);
    try {
      const result = await decodeHighwayVinViaVpic(serialNumber);
      if (result.ok) {
        onExternalSuggestionResolved(result.suggestion);
      } else {
        setLookupStatusMessage(result.message);
      }
    } finally {
      setIsLookingUpVin(false);
    }
  };

  const handleLookupEpaFamily = () => {
    setLookupStatusMessage(null);
    const matched = lookupEpaEngineFamily(epaFamilyInput);
    if (!matched) {
      setLookupStatusMessage(
        'Enter a valid 12-character EPA engine family code from the emissions plate (e.g. PCEXL06.7AAB).',
      );
      return;
    }
    onExternalSuggestionResolved(matched);
  };

  const specEntries = suggestion ? Object.entries(suggestion.specs) : [];

  return (
    <div className="space-y-2">
      {suggestion && (
        <div
          className="rounded-md border border-primary/30 bg-primary/5 p-3 text-xs space-y-2"
          data-testid="equipment-spec-suggestion-banner"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 font-medium text-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />
              <span>Suggested Specs: {suggestion.summaryLabel}</span>
            </div>
            <Badge variant="outline" className="text-[10px]">
              Source: {SOURCE_LABELS[suggestion.source]}
            </Badge>
          </div>

          <div className="flex flex-wrap gap-x-3 gap-y-1 text-muted-foreground">
            {suggestion.manufacturer && (
              <span>
                Make: <strong className="text-foreground">{suggestion.manufacturer}</strong>
              </span>
            )}
            {suggestion.model && (
              <span>
                Model: <strong className="text-foreground">{suggestion.model}</strong>
              </span>
            )}
            {suggestion.category && (
              <span>
                Category:{' '}
                <strong className="text-foreground">
                  {suggestion.category}
                  {suggestion.subtype ? ` / ${suggestion.subtype}` : ''}
                </strong>
              </span>
            )}
            {specEntries.map(([key, value]) => (
              <span key={key}>
                {key.replace(/_/g, ' ')}: <strong className="text-foreground">{value}</strong>
              </span>
            ))}
          </div>

          <div className="flex items-center gap-2 pt-1">
            <Button
              type="button"
              size="sm"
              variant="default"
              className="h-7 px-2.5 text-xs"
              onClick={() => onAcceptSuggestion(suggestion)}
            >
              <Check className="mr-1 h-3.5 w-3.5" />
              Accept Suggestion
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs"
              onClick={() => onIgnoreSuggestion(suggestion.key)}
            >
              <X className="mr-1 h-3.5 w-3.5" />
              Ignore
            </Button>
          </div>
        </div>
      )}

      <div className="pt-1">
        <Button
          type="button"
          variant="link"
          size="sm"
          className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
          onClick={() => setShowEnrichTools((prev) => !prev)}
        >
          {showEnrichTools
            ? 'Hide VIN / EPA engine plate lookup'
            : 'Optional: Decode 17-char highway VIN or 12-char EPA engine family'}
        </Button>

        {showEnrichTools && (
          <div className="mt-2 rounded-md border bg-muted/20 p-3 space-y-3 text-xs">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-muted-foreground">
                Highway truck/trailer 17-char VIN in Serial Number:
              </span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                disabled={isLookingUpVin || !serialNumber.trim()}
                onClick={() => void handleDecodeVin()}
              >
                {isLookingUpVin ? 'Decoding VIN...' : 'Decode Highway VIN (NHTSA vPIC)'}
              </Button>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="epa-engine-family-input" className="text-xs">
                12-char EPA Engine Family (from emissions plate)
              </Label>
              <div className="flex gap-2">
                <Input
                  id="epa-engine-family-input"
                  placeholder="e.g. PCEXL06.7AAB"
                  maxLength={12}
                  value={epaFamilyInput}
                  onChange={(e) => setEpaFamilyInput(e.target.value.toUpperCase())}
                  className="h-8 text-xs font-mono"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs shrink-0"
                  disabled={!epaFamilyInput.trim()}
                  onClick={handleLookupEpaFamily}
                >
                  Lookup EPA Plate
                </Button>
              </div>
            </div>

            {lookupStatusMessage && (
              <p className="text-xs text-muted-foreground" role="status">
                {lookupStatusMessage}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
