import type { LucideIcon } from 'lucide-react';

/** Categories for grouping widgets in the catalog */
export type WidgetCategory = 'overview' | 'work-orders' | 'equipment' | 'team' | 'inventory';

/** Definition for a dashboard widget that can be registered in the widget catalog */
export interface WidgetDefinition {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  component: React.ComponentType;
  /** Column span (out of 12) used for CSS grid placement on large screens */
  defaultSize: { w: number; h: number };
  category: WidgetCategory;
  requiredPermission?: string;
  featureFlag?: string;
}

/** Serialized dashboard preferences stored in localStorage and Supabase */
export interface DashboardPreferences {
  activeWidgets: string[];
  updatedAt: string;
}

/** Supabase row shape for user_dashboard_preferences table */
export interface DashboardPreferencesRow {
  id: string;
  user_id: string;
  organization_id: string;
  layouts: Record<string, unknown> | null;
  active_widgets: string[];
  updated_at: string;
}
