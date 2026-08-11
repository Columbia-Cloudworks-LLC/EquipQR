import React from 'react';
import { render } from '@vitest-harness/utils/test-utils';
import { CompatibilityRulesEditor } from '@/features/inventory/components/CompatibilityRulesEditor';
import { PMTemplateCompatibilityRulesEditor } from '@/features/pm-templates/components/PMTemplateCompatibilityRulesEditor';
import type { PartCompatibilityRuleFormData } from '@/features/inventory/types/inventory';
import type { PMTemplateCompatibilityRuleFormData } from '@/features/pm-templates/types/pmTemplateCompatibility';

type EditorRenderOptions = { disabled?: boolean };

export function renderInventoryCompatibilityRulesEditor(
  rules: PartCompatibilityRuleFormData[],
  onChange: (rules: PartCompatibilityRuleFormData[]) => void,
  options?: EditorRenderOptions,
) {
  return render(
    <CompatibilityRulesEditor rules={rules} onChange={onChange} disabled={options?.disabled} />,
  );
}

export function renderPmTemplateCompatibilityRulesEditor(
  rules: PMTemplateCompatibilityRuleFormData[],
  onChange: (rules: PMTemplateCompatibilityRuleFormData[]) => void,
  options?: EditorRenderOptions,
) {
  return render(
    <PMTemplateCompatibilityRulesEditor
      rules={rules}
      onChange={onChange}
      disabled={options?.disabled}
    />,
  );
}
