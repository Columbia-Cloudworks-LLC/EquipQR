import React, { useMemo } from 'react';
import { Plus, X, Settings2, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useEquipmentManufacturersAndModels } from '@/features/equipment/hooks/useEquipment';
import { useEquipmentMatchCount } from '@/features/inventory/hooks/useInventory';
import type { PartCompatibilityRuleFormData } from '@/features/inventory/types/inventory';

interface CompatibilityRulesEditorProps {
  rules: PartCompatibilityRuleFormData[];
  onChange: (rules: PartCompatibilityRuleFormData[]) => void;
  disabled?: boolean;
}

const ANY_MODEL_VALUE = '__ANY_MODEL__';

export const CompatibilityRulesEditor: React.FC<CompatibilityRulesEditorProps> = ({
  rules,
  onChange,
  disabled = false
}) => {
  const { currentOrganization } = useOrganization();
  const { data: manufacturersData = [], isLoading: isLoadingMfrs } = useEquipmentManufacturersAndModels(
    currentOrganization?.id
  );

  // Get match count for current rules
  const { data: matchCount = 0 } = useEquipmentMatchCount(
    currentOrganization?.id,
    rules.filter(r => r.manufacturer.trim().length > 0)
  );

  // Create a map for quick model lookup by manufacturer
  const manufacturerModelsMap = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const mfr of manufacturersData) {
      map.set(mfr.manufacturer.toLowerCase(), mfr.models);
    }
    return map;
  }, [manufacturersData]);

  // Get list of manufacturers for dropdown
  const manufacturers = useMemo(() => {
    return manufacturersData.map(m => m.manufacturer);
  }, [manufacturersData]);

  // Get models for a specific manufacturer
  const getModelsForManufacturer = (manufacturer: string): string[] => {
    return manufacturerModelsMap.get(manufacturer.toLowerCase()) || [];
  };

  // Check if a rule already exists (for duplicate detection)
  const isDuplicateRule = (manufacturer: string, model: string | null, excludeIndex: number): boolean => {
    const mfrNorm = manufacturer.trim().toLowerCase();
    const modelNorm = model?.trim().toLowerCase() || null;
    
    return rules.some((rule, idx) => {
      if (idx === excludeIndex) return false;
      const ruleMfrNorm = rule.manufacturer.trim().toLowerCase();
      const ruleModelNorm = rule.model?.trim().toLowerCase() || null;
      return ruleMfrNorm === mfrNorm && ruleModelNorm === modelNorm;
    });
  };

  const handleAddRule = () => {
    onChange([...rules, { manufacturer: '', model: null }]);
  };

  const handleRemoveRule = (index: number) => {
    const newRules = [...rules];
    newRules.splice(index, 1);
    onChange(newRules);
  };

  const handleManufacturerChange = (index: number, manufacturer: string) => {
    const newRules = [...rules];
    newRules[index] = { 
      ...newRules[index], 
      manufacturer,
      model: null // Reset model when manufacturer changes
    };
    onChange(newRules);
  };

  const handleModelChange = (index: number, model: string) => {
    const newRules = [...rules];
    newRules[index] = { 
      ...newRules[index], 
      model: model === ANY_MODEL_VALUE ? null : model 
    };
    onChange(newRules);
  };

  // Count valid rules (non-empty manufacturer)
  const validRulesCount = rules.filter(r => r.manufacturer.trim().length > 0).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings2 className="h-4 w-4" />
            Compatibility Rules
          </div>
          {validRulesCount > 0 && (
            <Badge variant="secondary" className="font-normal">
              Matches {matchCount} equipment
            </Badge>
          )}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Match parts to equipment by manufacturer and model. Leave model empty to match all models from a manufacturer.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoadingMfrs ? (
          <div className="space-y-2">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="h-10 bg-muted rounded animate-pulse" />
            ))}
          </div>
        ) : manufacturers.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-4">
            <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No equipment found in your organization.</p>
            <p>Add equipment first to define compatibility rules.</p>
          </div>
        ) : (
          <>
            {/* Rules List */}
            <div className="space-y-3">
              {rules.map((rule, index) => {
                const availableModels = getModelsForManufacturer(rule.manufacturer);
                const isDuplicate = rule.manufacturer.trim().length > 0 && 
                  isDuplicateRule(rule.manufacturer, rule.model, index);

                return (
                  <div 
                    key={index} 
                    className={`flex items-center gap-2 p-3 border rounded-md ${
                      isDuplicate ? 'border-destructive bg-destructive/5' : ''
                    }`}
                  >
                    {/* Manufacturer Select */}
                    <div className="flex-1">
                      <Select
                        value={rule.manufacturer}
                        onValueChange={(value) => handleManufacturerChange(index, value)}
                        disabled={disabled}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select manufacturer..." />
                        </SelectTrigger>
                        <SelectContent>
                          {manufacturers.map((mfr) => (
                            <SelectItem key={mfr} value={mfr}>
                              {mfr}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Model Select */}
                    <div className="flex-1">
                      <Select
                        value={rule.model || ANY_MODEL_VALUE}
                        onValueChange={(value) => handleModelChange(index, value)}
                        disabled={disabled || !rule.manufacturer}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select model..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={ANY_MODEL_VALUE}>
                            <span className="italic">Any Model</span>
                          </SelectItem>
                          {availableModels.map((model) => (
                            <SelectItem key={model} value={model}>
                              {model}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Remove Button */}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveRule(index)}
                      disabled={disabled}
                      className="shrink-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>

            {/* Add Rule Button */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddRule}
              disabled={disabled}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Rule
            </Button>

            {/* Help Text */}
            {rules.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Rules use case-insensitive matching. Duplicate rules are highlighted and will be deduplicated on save.
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default CompatibilityRulesEditor;
