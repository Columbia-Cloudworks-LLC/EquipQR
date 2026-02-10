import type { LucideIcon } from 'lucide-react';
import type { Layout } from 'react-grid-layout';

/** Categories for grouping widgets in the catalog */
export type WidgetCategory = 'overview' | 'work-orders' | 'equipment' | 'team' | 'inventory';

/** Definition for a dashboard widget that can be registered in the widget catalog */
export interface WidgetDefinition {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  component: React.ComponentType;
  defaultSize: { w: number; h: number };
  minSize?: { w: number; h: number };
  maxSize?: { w: number; h: number };
  category: WidgetCategory;
  requiredPermission?: string;
  featureFlag?: string;
}

/** Responsive breakpoint names used by the dashboard grid */
export type DashboardBreakpoint = 'lg' | 'md' | 'sm' | 'xs' | 'xxs';

/** Per-breakpoint layout definitions for react-grid-layout */
export type DashboardLayouts = Record<DashboardBreakpoint, Layout[]>;

/** Serialized dashboard preferences stored in localStorage and Supabase */
export interface DashboardPreferences {
  layouts: DashboardLayouts;
  activeWidgets: string[];
  updatedAt: string;
}

/** Supabase row shape for user_dashboard_preferences table */
export interface DashboardPreferencesRow {
  id: string;
  user_id: string;
  organization_id: string;
  layouts: Record<string, unknown>;
  active_widgets: string[];
  updated_at: string;
}

/** Grid configuration constants */
export const DASHBOARD_GRID_CONFIG = {
  breakpoints: { lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 } as Record<DashboardBreakpoint, number>,
  cols: { lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 } as Record<DashboardBreakpoint, number>,
  rowHeight: 60,
  margin: [16, 16] as [number, number],
  containerPadding: [0, 0] as [number, number],
} as const;
