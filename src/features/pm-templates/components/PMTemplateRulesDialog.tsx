import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, Save } from 'lucide-react';
import { PMTemplateCompatibilityRulesEditor } from '@/features/pm-templates/components/PMTemplateCompatibilityRulesEditor';
import {
  usePMTemplateCompatibilityRules,
  useBulkSetPMTemplateRules,
} from '@/features/pm-templates/hooks/usePMTemplateCompatibility';
import type { PMTemplateCompatibilityRuleFormData } from '@/features/pm-templates/types/pmTemplateCompatibility';

interface PMTemplateRulesDialogProps {
  templateId: string;
  templateName: string;
  open: boolean;
  onClose: () => void;
}

/**
 * Dialog for managing PM template compatibility rules.
 * 
 * Used for quick access to rules management from template cards,
 * especially for global templates where the edit dialog is not available.
 */
export const PMTemplateRulesDialog: React.FC<PMTemplateRulesDialogProps> = ({
  templateId,
  templateName,
  open,
  onClose,
}) => {
  // Fetch existing rules
  const { data: savedRules = [], isLoading: isLoadingRules } = usePMTemplateCompatibilityRules(
    templateId,
    { enabled: open }
  );
  const bulkSetRules = useBulkSetPMTemplateRules();

  // Local state for editing
  const [editedRules, setEditedRules] = useState<PMTemplateCompatibilityRuleFormData[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  // Sync saved rules to local state when they load
  useEffect(() => {
    if (savedRules.length > 0) {
      setEditedRules(savedRules.map(r => ({ manufacturer: r.manufacturer, model: r.model })));
      setHasChanges(false);
    } else if (!isLoadingRules) {
      setEditedRules([]);
      setHasChanges(false);
    }
  }, [savedRules, isLoadingRules]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setHasChanges(false);
    }
  }, [open]);

  const handleRulesChange = (newRules: PMTemplateCompatibilityRuleFormData[]) => {
    setEditedRules(newRules);
    setHasChanges(true);
  };

  const handleSave = async () => {
    await bulkSetRules.mutateAsync({ templateId, rules: editedRules });
    setHasChanges(false);
    onClose();
  };

  const handleClose = () => {
    if (hasChanges) {
      // Could add confirmation dialog here, but for now just close
    }
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Configure Compatibility Rules</DialogTitle>
          <DialogDescription>
            Set which equipment types the "{templateName}" template applies to.
            These rules are specific to your organization.
          </DialogDescription>
        </DialogHeader>

        {isLoadingRules ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <PMTemplateCompatibilityRulesEditor
            rules={editedRules}
            onChange={handleRulesChange}
            disabled={bulkSetRules.isPending}
          />
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={bulkSetRules.isPending}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={bulkSetRules.isPending || !hasChanges}>
            {bulkSetRules.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save Rules
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
