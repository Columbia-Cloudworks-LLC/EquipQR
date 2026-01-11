import React, { useMemo } from 'react';
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from "@/components/ui/select";
import { Wrench, Info, CheckCircle2, Globe, Target, Zap } from "lucide-react";
import { WorkOrderFormData } from '@/features/work-orders/hooks/useWorkOrderForm';
import { usePMTemplates, type PMTemplateSummary } from '@/features/pm-templates/hooks/usePMTemplates';
import { useMatchingPMTemplates } from '@/features/pm-templates/hooks/usePMTemplateCompatibility';
import { useSimplifiedOrganizationRestrictions } from '@/features/organization/hooks/useSimplifiedOrganizationRestrictions';

interface WorkOrderPMSectionProps {
  values: WorkOrderFormData & { pmTemplateId?: string };
  setValue: (field: keyof (WorkOrderFormData & { pmTemplateId?: string }), value: string | boolean | null) => void;
  selectedEquipment?: { 
    id: string; 
    name: string; 
    default_pm_template_id?: string | null;
  } | null;
}

export const WorkOrderPMSection: React.FC<WorkOrderPMSectionProps> = ({
  values,
  setValue,
  selectedEquipment
}) => {
  const { data: allTemplates = [], isLoading } = usePMTemplates();
  const { restrictions } = useSimplifiedOrganizationRestrictions();
  
  // Fetch matching templates based on equipment manufacturer/model
  const { data: matchingTemplates = [] } = useMatchingPMTemplates(
    selectedEquipment?.id,
    { enabled: !!selectedEquipment?.id && !selectedEquipment?.default_pm_template_id }
  );

  // Check if equipment has an assigned template (direct assignment takes priority as override)
  const hasAssignedTemplate = selectedEquipment?.default_pm_template_id;
  const assignedTemplate = hasAssignedTemplate 
    ? allTemplates.find(t => t.id === selectedEquipment.default_pm_template_id)
    : null;
  
  // Build organized template lists with matching templates first
  const { matchedTemplates, otherTemplates, allAvailableTemplates } = useMemo(() => {
    // If there's an assigned template, no dropdown needed
    if (hasAssignedTemplate) {
      return { matchedTemplates: [], otherTemplates: [], allAvailableTemplates: [] };
    }
    
    // Filter templates based on user restrictions
    const availableTemplates = restrictions.canCreateCustomPMTemplates 
      ? allTemplates 
      : allTemplates.filter(t => !t.organization_id);
    
    // Get IDs of matched templates
    const matchedIds = new Set(matchingTemplates.map(m => m.template_id));
    
    // Separate matched and non-matched templates
    const matched: Array<PMTemplateSummary & { matchType?: 'model' | 'manufacturer' }> = [];
    const other: PMTemplateSummary[] = [];
    
    for (const template of availableTemplates) {
      if (matchedIds.has(template.id)) {
        const matchInfo = matchingTemplates.find(m => m.template_id === template.id);
        matched.push({
          ...template,
          matchType: matchInfo?.match_type
        });
      } else {
        other.push(template);
      }
    }
    
    // Sort matched: model matches first, then manufacturer matches
    matched.sort((a, b) => {
      if (a.matchType === 'model' && b.matchType !== 'model') return -1;
      if (a.matchType !== 'model' && b.matchType === 'model') return 1;
      return a.name.localeCompare(b.name);
    });
    
    // Ensure current value is in the list (for edit mode)
    const all = [...matched, ...other];
    if (values.pmTemplateId) {
      const currentTemplate = allTemplates.find(t => t.id === values.pmTemplateId);
      if (currentTemplate && !all.find(t => t.id === currentTemplate.id)) {
        other.push(currentTemplate);
      }
    }
    
    return { 
      matchedTemplates: matched, 
      otherTemplates: other,
      allAvailableTemplates: [...matched, ...other]
    };
  }, [allTemplates, matchingTemplates, hasAssignedTemplate, restrictions.canCreateCustomPMTemplates, values.pmTemplateId]);
  
  // Find the selected template - prioritize assigned, then form value, then first matched, then first available
  const selectedTemplate = useMemo(() => {
    if (assignedTemplate) return assignedTemplate;
    if (values.pmTemplateId) {
      const found = allAvailableTemplates.find(t => t.id === values.pmTemplateId);
      if (found) return found;
    }
    // Auto-select first matched template if available
    if (matchedTemplates.length > 0) return matchedTemplates[0];
    // Fallback to Forklift PM or first template
    return allAvailableTemplates.find(t => t.name === 'Forklift PM') || allAvailableTemplates[0];
  }, [assignedTemplate, values.pmTemplateId, allAvailableTemplates, matchedTemplates]);
  
  // Auto-set template when equipment is selected
  React.useEffect(() => {
    if (values.hasPM) {
      if (hasAssignedTemplate && assignedTemplate) {
        // Direct assignment - use assigned template
        setValue('pmTemplateId', assignedTemplate.id);
      } else if (matchedTemplates.length > 0 && !values.pmTemplateId) {
        // Auto-select first matched template if no template selected yet
        setValue('pmTemplateId', matchedTemplates[0].id);
      }
    }
  }, [hasAssignedTemplate, assignedTemplate, matchedTemplates, values.hasPM, values.pmTemplateId, setValue]);

  const handleTemplateChange = (templateId: string) => {
    setValue('pmTemplateId', templateId);
  };

  return (
    <>
      <div className="flex items-center space-x-2 p-3 border rounded-lg bg-muted/50">
        <Checkbox
          id="hasPM"
          checked={values.hasPM}
          onCheckedChange={(checked) => setValue('hasPM', checked as boolean)}
        />
        <div className="flex items-center gap-2">
          <Wrench className="h-4 w-4 text-primary" />
          <Label htmlFor="hasPM" className="text-sm font-medium cursor-pointer">
            Include Preventative Maintenance
          </Label>
        </div>
      </div>

      {values.hasPM && (
        <div className="space-y-3">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              This work order will include a preventative maintenance checklist that must be completed before the work order can be marked as finished.
            </AlertDescription>
          </Alert>

          {/* Template Selector */}
          <div className="space-y-2">
            <Label htmlFor="pmTemplate">Checklist Template</Label>
            {hasAssignedTemplate && assignedTemplate ? (
              <div className="p-3 border rounded-lg bg-primary/5">
                <div className="flex items-center gap-2">
                  <Wrench className="h-4 w-4 text-primary" />
                  <span className="font-medium">{assignedTemplate.name}</span>
                  <span className="text-xs text-muted-foreground">(Assigned to {selectedEquipment?.name})</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  This equipment uses the assigned PM template. Template selection is not available.
                </p>
              </div>
            ) : (
              <>
                {/* Show matching templates info */}
                {matchedTemplates.length > 0 && selectedEquipment && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                    <Target className="h-3 w-3 text-primary" />
                    <span>
                      {matchedTemplates.length} template{matchedTemplates.length !== 1 ? 's' : ''} match{matchedTemplates.length === 1 ? 'es' : ''} this equipment
                    </span>
                  </div>
                )}
                <Select
                  value={values.pmTemplateId || ''}
                  onValueChange={handleTemplateChange}
                  disabled={isLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a checklist template..." />
                  </SelectTrigger>
                  <SelectContent>
                    {/* Matched templates group */}
                    {matchedTemplates.length > 0 && (
                      <SelectGroup>
                        <SelectLabel className="flex items-center gap-1">
                          <Zap className="h-3 w-3" />
                          Recommended for this equipment
                        </SelectLabel>
                        {matchedTemplates.map((template) => (
                          <SelectItem key={template.id} value={template.id}>
                            <div className="flex items-center gap-2">
                              <span>{template.name}</span>
                              {template.matchType === 'model' && (
                                <span className="text-xs text-primary">(exact match)</span>
                              )}
                              {template.matchType === 'manufacturer' && (
                                <span className="text-xs text-muted-foreground">(manufacturer)</span>
                              )}
                              {template.organization_id === null && (
                                <Globe className="w-3 h-3 text-muted-foreground" />
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    )}
                    
                    {/* Other templates group */}
                    {otherTemplates.length > 0 && (
                      <SelectGroup>
                        {matchedTemplates.length > 0 && (
                          <SelectLabel>Other templates</SelectLabel>
                        )}
                        {otherTemplates.map((template) => (
                          <SelectItem key={template.id} value={template.id}>
                            <div className="flex items-center gap-2">
                              <span>{template.name}</span>
                              {template.organization_id === null && (
                                <div className="flex items-center gap-1">
                                  <Globe className="w-3 h-3" />
                                  <span className="text-xs text-muted-foreground">(Global)</span>
                                </div>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    )}
                    
                    {!restrictions.canCreateCustomPMTemplates && allTemplates.some(t => t.organization_id) && (
                      <div className="px-2 py-1 text-xs text-muted-foreground border-t">
                        Custom templates require user licenses
                      </div>
                    )}
                  </SelectContent>
                </Select>
              </>
            )}
          </div>
          
          {/* Template Preview */}
          {selectedTemplate && (
            <div className="bg-muted/30 p-3 rounded-lg border">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">PM Checklist Preview</span>
                <span className="text-xs text-muted-foreground">({selectedTemplate.itemCount} items)</span>
              </div>
              <div className="text-xs text-muted-foreground space-y-1">
                {selectedTemplate.sections.map((section) => (
                  <div key={section.name}>• {section.name} ({section.count} items)</div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
};

