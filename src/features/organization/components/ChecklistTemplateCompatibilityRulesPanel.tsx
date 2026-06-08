import { Button } from '@/components/ui/button';
import { Loader2, Save } from 'lucide-react';
import { PMTemplateCompatibilityRulesEditor } from '@/features/pm-templates/components/PMTemplateCompatibilityRulesEditor';
import type { PMTemplateCompatibilityRuleFormData } from '@/features/pm-templates/types/pmTemplateCompatibility';

type ChecklistTemplateCompatibilityRulesPanelProps = {
  isLoadingRules: boolean;
  editedRules: PMTemplateCompatibilityRuleFormData[];
  hasRulesChanges: boolean;
  isSavingRules: boolean;
  onRulesChange: (rules: PMTemplateCompatibilityRuleFormData[]) => void;
  onSaveRules: () => void;
};

export function ChecklistTemplateCompatibilityRulesPanel({
  isLoadingRules,
  editedRules,
  hasRulesChanges,
  isSavingRules,
  onRulesChange,
  onSaveRules,
}: ChecklistTemplateCompatibilityRulesPanelProps) {
  if (isLoadingRules) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PMTemplateCompatibilityRulesEditor
        rules={editedRules}
        onChange={onRulesChange}
        disabled={isSavingRules}
      />
      {hasRulesChanges && (
        <div className="flex justify-end">
          <Button onClick={onSaveRules} disabled={isSavingRules}>
            {isSavingRules ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save Compatibility Rules
          </Button>
        </div>
      )}
    </div>
  );
}
