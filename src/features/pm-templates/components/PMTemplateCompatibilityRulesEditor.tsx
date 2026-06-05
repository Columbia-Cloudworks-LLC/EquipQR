import React from 'react';
import { Plus, X } from 'lucide-react';
import { CompatibilityRulesCardShell } from '@/components/common/CompatibilityRulesCardShell';
import { CompatibilityManufacturerSelect } from '@/components/common/CompatibilityManufacturerSelect';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useEquipmentManufacturersAndModels } from '@/features/equipment/hooks/useEquipment';
import { useEquipmentMatchCountForPMRules } from '@/features/pm-templates/hooks/usePMTemplateCompatibility';
import type { PMTemplateCompatibilityRuleFormData } from '@/features/pm-templates/types/pmTemplateCompatibility';
import { useManufacturerModelLookup } from '@/features/equipment/utils/manufacturerModelLookup';

interface PMTemplateCompatibilityRulesEditorProps {
  rules: PMTemplateCompatibilityRuleFormData[];
  onChange: (rules: PMTemplateCompatibilityRuleFormData[]) => void;
  disabled?: boolean;
}

const ANY_MODEL_VALUE = '__ANY_MODEL__';

export const PMTemplateCompatibilityRulesEditor: React.FC<PMTemplateCompatibilityRulesEditorProps> = ({
  rules,
  onChange,
  disabled = false
}) => {
  const { currentOrganization } = useOrganization();
  const { data: manufacturersData = [], isLoading: isLoadingMfrs } = useEquipmentManufacturersAndModels(
    currentOrganization?.id
  );

  // Get match count for current rules
  const { data: matchCount = 0 } = useEquipmentMatchCountForPMRules(
    currentOrganization?.id,
    rules.filter((r) => (r.manufacturer ?? '').trim().length > 0)
  );

  const { manufacturers, getModelsForManufacturer } = useManufacturerModelLookup(manufacturersData);

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
  const validRulesCount = rules.filter(
    (r) => (r.manufacturer ?? '').trim().length > 0,
  ).length;

  return (
    <CompatibilityRulesCardShell
      title="Equipment Compatibility"
      description="Define which equipment this PM template applies to by manufacturer and model. Leave model empty to match all models from a manufacturer."
      validRulesCount={validRulesCount}
      matchCount={matchCount}
      isLoadingMfrs={isLoadingMfrs}
      hasManufacturers={manufacturers.length > 0}
      footer={
        <>
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
          {rules.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Rules use case-insensitive matching. When creating PM work orders,
              templates matching the selected equipment will be suggested first.
            </p>
          )}
        </>
      }
    >
      <div className="space-y-3">
              {rules.map((rule, index) => {
                const availableModels = getModelsForManufacturer(rule.manufacturer);
                const manufacturer = rule.manufacturer ?? '';
                const isDuplicate =
                  manufacturer.trim().length > 0 &&
                  isDuplicateRule(manufacturer, rule.model, index);

                return (
                  <div 
                    key={index} 
                    className={`flex items-center gap-2 p-3 border rounded-md ${
                      isDuplicate ? 'border-destructive bg-destructive/5' : ''
                    }`}
                  >
                    {/* Manufacturer Select */}
                    <div className="flex-1">
                      <CompatibilityManufacturerSelect
                        value={rule.manufacturer}
                        onValueChange={(value) => handleManufacturerChange(index, value)}
                        manufacturers={manufacturers}
                        disabled={disabled}
                      />
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
    </CompatibilityRulesCardShell>
  );
};
