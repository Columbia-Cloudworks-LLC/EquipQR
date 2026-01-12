import React, { useMemo, useCallback } from 'react';
import { Plus, X, Settings2, AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useEquipmentManufacturersAndModels } from '@/features/equipment/hooks/useEquipment';
import { useEquipmentMatchCount } from '@/features/inventory/hooks/useInventory';
import type { PartCompatibilityRuleFormData, ModelMatchType, VerificationStatus } from '@/features/inventory/types/inventory';

interface CompatibilityRulesEditorProps {
  rules: PartCompatibilityRuleFormData[];
  onChange: (rules: PartCompatibilityRuleFormData[]) => void;
  disabled?: boolean;
}

// Match type options with descriptions (Any Model first as the broadest/simplest option)
const MATCH_TYPE_OPTIONS: { value: ModelMatchType; label: string; description: string }[] = [
  { value: 'any', label: 'Any Model', description: 'Matches all models from this manufacturer' },
  { value: 'exact', label: 'Specific Model', description: 'Matches a specific model exactly' },
  { value: 'prefix', label: 'Starts With', description: 'Matches models starting with a pattern (e.g., "JL-" matches JL-100, JL-200)' },
  { value: 'wildcard', label: 'Pattern', description: 'Matches models using * wildcard (e.g., "D*T" matches D6T, D8T)' },
];

// Status options (ordered by lifecycle: new → deprecated → verified as final confirmation)
const STATUS_OPTIONS: { value: VerificationStatus; label: string; className: string }[] = [
  { value: 'unverified', label: 'Unverified', className: 'bg-yellow-100 text-yellow-800' },
  { value: 'deprecated', label: 'Deprecated', className: 'bg-gray-100 text-gray-800' },
  { value: 'verified', label: 'Verified', className: 'bg-green-100 text-green-800' },
];

/**
 * Validates a pattern and returns normalized preview or error message.
 */
const validatePattern = (matchType: ModelMatchType, pattern: string): { valid: boolean; preview: string; error?: string } => {
  const trimmed = pattern.trim();
  
  if (matchType === 'any') {
    return { valid: true, preview: '*' };
  }
  
  if (matchType === 'exact') {
    return { valid: trimmed.length > 0, preview: trimmed.toLowerCase(), error: trimmed.length === 0 ? 'Model is required' : undefined };
  }
  
  if (matchType === 'prefix') {
    if (trimmed.length === 0) {
      return { valid: false, preview: '', error: 'Prefix pattern is required' };
    }
    if (trimmed.includes('*') || trimmed.includes('?')) {
      return { valid: false, preview: '', error: 'Prefix cannot contain wildcards (* or ?)' };
    }
    return { valid: true, preview: `${trimmed.toLowerCase()}*` };
  }
  
  if (matchType === 'wildcard') {
    if (trimmed.length === 0) {
      return { valid: false, preview: '', error: 'Pattern is required' };
    }
    const asteriskCount = (trimmed.match(/\*/g) || []).length;
    if (asteriskCount > 2) {
      return { valid: false, preview: '', error: 'Pattern can have at most 2 wildcards (*)' };
    }
    if (trimmed === '*' || trimmed === '**' || trimmed === '*-*') {
      return { valid: false, preview: '', error: 'Pattern must include at least 2 non-wildcard characters' };
    }
    // Convert to SQL LIKE preview
    const sqlPattern = trimmed.toLowerCase().replace(/\*/g, '%').replace(/\?/g, '_');
    return { valid: true, preview: sqlPattern };
  }
  
  return { valid: true, preview: trimmed.toLowerCase() };
};

export const CompatibilityRulesEditor: React.FC<CompatibilityRulesEditorProps> = ({
  rules,
  onChange,
  disabled = false
}) => {
  const { currentOrganization } = useOrganization();
  const { data: manufacturersData = [], isLoading: isLoadingMfrs } = useEquipmentManufacturersAndModels(
    currentOrganization?.id
  );

  // Transform rules for match count query (include match_type in the payload)
  const rulesForCount = useMemo(() => 
    rules
      .filter(r => r.manufacturer.trim().length > 0)
      .map(r => ({
        manufacturer: r.manufacturer,
        model: r.model,
        match_type: r.match_type || 'exact'
      })),
    [rules]
  );

  // Get match count for current rules
  const { data: matchCount = 0 } = useEquipmentMatchCount(
    currentOrganization?.id,
    rulesForCount
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
  const getModelsForManufacturer = useCallback((manufacturer: string): string[] => {
    return manufacturerModelsMap.get(manufacturer.toLowerCase()) || [];
  }, [manufacturerModelsMap]);

  // Check if a rule already exists (for duplicate detection)
  const isDuplicateRule = useCallback((rule: PartCompatibilityRuleFormData, excludeIndex: number): boolean => {
    const mfrNorm = rule.manufacturer.trim().toLowerCase();
    const modelNorm = rule.model?.trim().toLowerCase() || null;
    const matchType = rule.match_type || 'exact';
    
    return rules.some((r, idx) => {
      if (idx === excludeIndex) return false;
      const rMfrNorm = r.manufacturer.trim().toLowerCase();
      const rModelNorm = r.model?.trim().toLowerCase() || null;
      const rMatchType = r.match_type || 'exact';
      return rMfrNorm === mfrNorm && rModelNorm === modelNorm && rMatchType === matchType;
    });
  }, [rules]);

  const handleAddRule = useCallback(() => {
    onChange([...rules, { manufacturer: '', model: null, match_type: 'exact', status: 'unverified' }]);
  }, [rules, onChange]);

  const handleRemoveRule = useCallback((index: number) => {
    const newRules = [...rules];
    newRules.splice(index, 1);
    onChange(newRules);
  }, [rules, onChange]);

  const handleRuleChange = useCallback((index: number, updates: Partial<PartCompatibilityRuleFormData>) => {
    const newRules = [...rules];
    const currentRule = newRules[index];
    
    // If match_type is changing to 'any', clear the model
    if (updates.match_type === 'any') {
      updates.model = null;
    }
    
    // If manufacturer is changing, reset model unless match_type allows free text
    if (updates.manufacturer && updates.manufacturer !== currentRule.manufacturer) {
      const currentMatchType = updates.match_type || currentRule.match_type || 'exact';
      if (currentMatchType === 'exact') {
        updates.model = null;
      }
    }
    
    newRules[index] = { ...currentRule, ...updates };
    onChange(newRules);
  }, [rules, onChange]);

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
          Match parts to equipment by manufacturer and model pattern. Use different match types for flexible targeting.
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
                const matchType: ModelMatchType = rule.match_type || 'exact';
                const availableModels = getModelsForManufacturer(rule.manufacturer);
                const isDuplicate = rule.manufacturer.trim().length > 0 && isDuplicateRule(rule, index);
                const validation = validatePattern(matchType, rule.model || '');
                const useDropdown = matchType === 'exact';

                return (
                  <div 
                    key={index} 
                    className={`p-3 border rounded-md space-y-2 ${
                      isDuplicate ? 'border-destructive bg-destructive/5' : ''
                    }`}
                  >
                    {/* Row 1: Manufacturer + Match Type + Remove */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Manufacturer Select */}
                      <div className="flex-1 min-w-[180px]">
                        <Select
                          value={rule.manufacturer}
                          onValueChange={(value) => handleRuleChange(index, { manufacturer: value })}
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

                      {/* Match Type Select */}
                      <div className="w-[150px]">
                        <Select
                          value={matchType}
                          onValueChange={(value) => handleRuleChange(index, { match_type: value as ModelMatchType })}
                          disabled={disabled}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {MATCH_TYPE_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span>{opt.label}</span>
                                    </TooltipTrigger>
                                    <TooltipContent side="right">
                                      <p className="max-w-xs">{opt.description}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
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

                    {/* Row 2: Model Input + Status */}
                    <div className="flex items-center gap-2">
                      {/* Model section */}
                      {matchType === 'any' ? (
                        // Any Model: show confirmation text
                        <div className="flex-1 flex items-center gap-2 text-sm text-muted-foreground px-3 py-2 bg-muted/50 rounded-md">
                          <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                          <span>Matches all models from this manufacturer</span>
                        </div>
                      ) : useDropdown ? (
                        // Specific Model: dropdown
                        <div className="flex-1 space-y-1">
                          <Select
                            value={rule.model || ''}
                            onValueChange={(value) => handleRuleChange(index, { model: value || null })}
                            disabled={disabled || !rule.manufacturer}
                          >
                            <SelectTrigger className={`w-full ${!rule.model && rule.manufacturer ? 'border-amber-400' : ''}`}>
                              <SelectValue placeholder="Select model..." />
                            </SelectTrigger>
                            <SelectContent>
                              {availableModels.map((model) => (
                                <SelectItem key={model} value={model}>
                                  {model}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {/* Validation hint for Specific Model with no selection */}
                          {!rule.model && rule.manufacturer && (
                            <p className="text-xs text-amber-600">
                              Select a model, or change match type to "Any Model" to match all models
                            </p>
                          )}
                        </div>
                      ) : (
                        // Prefix/Wildcard: text input
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <Input
                              value={rule.model || ''}
                              onChange={(e) => handleRuleChange(index, { model: e.target.value })}
                              placeholder={
                                matchType === 'prefix' 
                                  ? 'Enter prefix (e.g., JL-)...'
                                  : 'Enter pattern (e.g., D*T, *-100)...'
                              }
                              disabled={disabled || !rule.manufacturer}
                              className={!validation.valid && rule.model ? 'border-destructive' : ''}
                            />
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Info className="h-4 w-4 text-muted-foreground shrink-0" />
                                </TooltipTrigger>
                                <TooltipContent side="right" className="max-w-xs">
                                  {matchType === 'prefix' ? (
                                    <p>Enter the beginning of the model name. For example, "JL-" will match JL-100, JL-200, etc.</p>
                                  ) : (
                                    <p>Use * for wildcards. For example, "D*T" matches D6T, D8T. Use ? for single character.</p>
                                  )}
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                          {/* Pattern preview */}
                          {rule.model && (
                            <div className="text-xs">
                              {validation.valid ? (
                                <span className="text-muted-foreground">
                                  Pattern: <code className="bg-muted px-1 rounded">{validation.preview}</code>
                                </span>
                              ) : (
                                <span className="text-destructive">{validation.error}</span>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Status Select - always visible in Row 2 */}
                      <div className="w-[120px] shrink-0">
                        <Select
                          value={rule.status || 'unverified'}
                          onValueChange={(value) => handleRuleChange(index, { status: value as VerificationStatus })}
                          disabled={disabled}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {STATUS_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs ${opt.className}`}>
                                  {opt.value === 'verified' && <CheckCircle2 className="h-3 w-3" />}
                                  {opt.label}
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Optional notes input */}
                    {rule.status === 'verified' && (
                      <div className="pt-1">
                        <Input
                          value={rule.notes || ''}
                          onChange={(e) => handleRuleChange(index, { notes: e.target.value || null })}
                          placeholder="Verification notes (optional)..."
                          disabled={disabled}
                          className="text-sm"
                        />
                      </div>
                    )}
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
              <div className="text-xs text-muted-foreground space-y-1">
                <p>Rules use case-insensitive matching. Duplicate rules are highlighted and will be deduplicated on save.</p>
                <p className="flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3 text-green-600" />
                  <span>Verified rules are shown first in part lookup results.</span>
                </p>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};
