import type { PMChecklistItem } from '@/features/pm-templates/services/preventativeMaintenanceService';

export type ChecklistTemplateEditorLayoutMode = 'standalone' | 'page';

export interface ChecklistTemplateEditorTemplate {
  id: string;
  name: string;
  description?: string | null;
  template_data: PMChecklistItem[];
  interval_value?: number | null;
  interval_type?: 'days' | 'hours' | null;
  organization_id?: string | null;
  is_protected?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ChecklistTemplateEditorHandle {
  save: () => Promise<string | undefined>;
  requestCancel: () => void;
  hasUnsavedChanges: () => boolean;
}
