import React from 'react';
import {
  Forklift,
  AlertTriangle,
  ClipboardList,
  TrendingUp,
  LayoutDashboard,
  ClipboardCheck,
  DollarSign,
  Zap,
} from 'lucide-react';
import type { WidgetDefinition, WidgetCategory } from '@/features/dashboard/types/dashboard';

// Lazy-load self-contained widget wrappers for code splitting.
// Each wrapper fetches its own data internally via hooks.
const StatsGridWidget = React.lazy(
  () => import('@/features/dashboard/components/widgets/StatsGridWidget')
);
const FleetEfficiencyWidget = React.lazy(
  () => import('@/features/dashboard/components/FleetEfficiencyScatterPlotCard')
);
const RecentEquipmentWidget = React.lazy(
  () => import('@/features/dashboard/components/widgets/RecentEquipmentWidget')
);
const RecentWorkOrdersWidget = React.lazy(
  () => import('@/features/dashboard/components/widgets/RecentWorkOrdersWidget')
);
const HighPriorityWOWidget = React.lazy(
  () => import('@/features/dashboard/components/widgets/HighPriorityWOWidget')
);
const PMComplianceWidget = React.lazy(
  () => import('@/features/dashboard/components/widgets/PMComplianceWidget')
);
const EquipmentByStatusWidget = React.lazy(
  () => import('@/features/dashboard/components/widgets/EquipmentByStatusWidget')
);
const CostTrendWidget = React.lazy(
  () => import('@/features/dashboard/components/widgets/CostTrendWidget')
);
const QuickActionsWidget = React.lazy(
  () => import('@/features/dashboard/components/widgets/QuickActionsWidget')
);

/**
 * Master widget registry. Every dashboard widget is registered here with metadata
 * that drives the widget catalog, default layout generation, and RBAC gating.
 */
export const WIDGET_REGISTRY: Map<string, WidgetDefinition> = new Map([
  ['stats-grid', {
    id: 'stats-grid',
    title: 'Key Metrics',
    description: 'Total equipment, overdue work orders, total work orders, and organization members',
    icon: LayoutDashboard,
    component: StatsGridWidget,
    defaultSize: { w: 12, h: 2 },
    category: 'overview' as WidgetCategory,
  }],
  ['fleet-efficiency', {
    id: 'fleet-efficiency',
    title: 'Fleet Efficiency',
    description: 'Scatter plot of team equipment count versus active work orders',
    icon: TrendingUp,
    component: FleetEfficiencyWidget,
    defaultSize: { w: 12, h: 7 },
    category: 'overview' as WidgetCategory,
  }],
  ['recent-equipment', {
    id: 'recent-equipment',
    title: 'Recent Equipment',
    description: 'Latest equipment added to your fleet',
    icon: Forklift,
    component: RecentEquipmentWidget,
    defaultSize: { w: 6, h: 6 },
    category: 'equipment' as WidgetCategory,
  }],
  ['recent-work-orders', {
    id: 'recent-work-orders',
    title: 'Recent Work Orders',
    description: 'Latest work order activity',
    icon: ClipboardList,
    component: RecentWorkOrdersWidget,
    defaultSize: { w: 6, h: 6 },
    category: 'work-orders' as WidgetCategory,
  }],
  ['high-priority-wo', {
    id: 'high-priority-wo',
    title: 'High Priority Work Orders',
    description: 'Work orders requiring immediate attention',
    icon: AlertTriangle,
    component: HighPriorityWOWidget,
    defaultSize: { w: 12, h: 4 },
    category: 'work-orders' as WidgetCategory,
  }],
  ['pm-compliance', {
    id: 'pm-compliance',
    title: 'PM Compliance',
    description: 'Preventive maintenance schedule status breakdown',
    icon: ClipboardCheck,
    component: PMComplianceWidget,
    defaultSize: { w: 6, h: 4 },
    category: 'equipment' as WidgetCategory,
  }],
  ['equipment-by-status', {
    id: 'equipment-by-status',
    title: 'Equipment by Status',
    description: 'Fleet breakdown by equipment status',
    icon: Forklift,
    component: EquipmentByStatusWidget,
    defaultSize: { w: 4, h: 4 },
    category: 'equipment' as WidgetCategory,
  }],
  ['cost-trend', {
    id: 'cost-trend',
    title: 'Cost Trend',
    description: 'Work order costs over time (weekly/monthly)',
    icon: DollarSign,
    component: CostTrendWidget,
    defaultSize: { w: 12, h: 4 },
    category: 'work-orders' as WidgetCategory,
  }],
  ['quick-actions', {
    id: 'quick-actions',
    title: 'Quick Actions',
    description: 'Shortcuts to common actions like creating work orders',
    icon: Zap,
    component: QuickActionsWidget,
    defaultSize: { w: 4, h: 3 },
    category: 'overview' as WidgetCategory,
  }],
]);

/** Get a single widget definition by ID */
export function getWidget(id: string): WidgetDefinition | undefined {
  return WIDGET_REGISTRY.get(id);
}

/** Get all registered widgets as an array */
export function getAllWidgets(): WidgetDefinition[] {
  return Array.from(WIDGET_REGISTRY.values());
}

/** Get widgets filtered by category */
export function getWidgetsByCategory(category: WidgetCategory): WidgetDefinition[] {
  return getAllWidgets().filter((w) => w.category === category);
}

/** Default widget IDs shown to new users, in display order */
export const DEFAULT_WIDGET_IDS = [
  'stats-grid',
  'fleet-efficiency',
  'recent-equipment',
  'recent-work-orders',
  'high-priority-wo',
];

/**
 * Returns the default active widget list for new users.
 * Filters out any IDs not present in the registry.
 */
export function generateDefaultLayout(
  activeWidgetIds?: string[]
): { activeWidgets: string[] } {
  const widgetIds = activeWidgetIds ?? DEFAULT_WIDGET_IDS;
  return {
    activeWidgets: widgetIds.filter((id) => WIDGET_REGISTRY.has(id)),
  };
}
