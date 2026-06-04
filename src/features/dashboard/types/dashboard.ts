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
