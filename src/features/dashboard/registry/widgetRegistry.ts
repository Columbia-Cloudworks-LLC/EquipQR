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
import type { Layout } from 'react-grid-layout';

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
    minSize: { w: 6, h: 2 },
    maxSize: { w: 12, h: 3 },
    category: 'overview' as WidgetCategory,
  }],
  ['fleet-efficiency', {
    id: 'fleet-efficiency',
    title: 'Fleet Efficiency',
    description: 'Scatter plot of team equipment count versus active work orders',
    icon: TrendingUp,
    component: FleetEfficiencyWidget,
    defaultSize: { w: 12, h: 7 },
    minSize: { w: 6, h: 5 },
    maxSize: { w: 12, h: 10 },
    category: 'overview' as WidgetCategory,
  }],
  ['recent-equipment', {
    id: 'recent-equipment',
    title: 'Recent Equipment',
    description: 'Latest equipment added to your fleet',
    icon: Forklift,
    component: RecentEquipmentWidget,
    defaultSize: { w: 6, h: 6 },
    minSize: { w: 4, h: 4 },
    maxSize: { w: 12, h: 8 },
    category: 'equipment' as WidgetCategory,
  }],
  ['recent-work-orders', {
    id: 'recent-work-orders',
    title: 'Recent Work Orders',
    description: 'Latest work order activity',
    icon: ClipboardList,
    component: RecentWorkOrdersWidget,
    defaultSize: { w: 6, h: 6 },
    minSize: { w: 4, h: 4 },
    maxSize: { w: 12, h: 8 },
    category: 'work-orders' as WidgetCategory,
  }],
  ['high-priority-wo', {
    id: 'high-priority-wo',
    title: 'High Priority Work Orders',
    description: 'Work orders requiring immediate attention',
    icon: AlertTriangle,
    component: HighPriorityWOWidget,
    defaultSize: { w: 12, h: 4 },
    minSize: { w: 6, h: 3 },
    maxSize: { w: 12, h: 8 },
    category: 'work-orders' as WidgetCategory,
  }],
  // Phase 2 widgets
  ['pm-compliance', {
    id: 'pm-compliance',
    title: 'PM Compliance',
    description: 'Preventive maintenance schedule status breakdown',
    icon: ClipboardCheck,
    component: PMComplianceWidget,
    defaultSize: { w: 6, h: 4 },
    minSize: { w: 4, h: 3 },
    maxSize: { w: 12, h: 6 },
    category: 'equipment' as WidgetCategory,
  }],
  ['equipment-by-status', {
    id: 'equipment-by-status',
    title: 'Equipment by Status',
    description: 'Fleet breakdown by equipment status',
    icon: Forklift,
    component: EquipmentByStatusWidget,
    defaultSize: { w: 4, h: 4 },
    minSize: { w: 3, h: 3 },
    maxSize: { w: 8, h: 6 },
    category: 'equipment' as WidgetCategory,
  }],
  ['cost-trend', {
    id: 'cost-trend',
    title: 'Cost Trend',
    description: 'Work order costs over time (weekly/monthly)',
    icon: DollarSign,
    component: CostTrendWidget,
    defaultSize: { w: 12, h: 4 },
    minSize: { w: 6, h: 3 },
    maxSize: { w: 12, h: 6 },
    category: 'work-orders' as WidgetCategory,
  }],
  ['quick-actions', {
    id: 'quick-actions',
    title: 'Quick Actions',
    description: 'Shortcuts to common actions like creating work orders',
    icon: Zap,
    component: QuickActionsWidget,
    defaultSize: { w: 4, h: 3 },
    minSize: { w: 3, h: 2 },
    maxSize: { w: 6, h: 4 },
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

/** Default widget IDs for new users */
export const DEFAULT_WIDGET_IDS = [
  'stats-grid',
  'fleet-efficiency',
  'recent-equipment',
  'recent-work-orders',
  'high-priority-wo',
];

/**
 * Generates a default layout for a given set of active widget IDs.
 * Positions widgets in a vertical stack at full width, following
 * the order they appear in DEFAULT_WIDGET_IDS.
 */
export function generateDefaultLayout(
  activeWidgetIds?: string[]
): { layouts: Record<string, Layout[]>; activeWidgets: string[] } {
  const widgetIds = activeWidgetIds ?? DEFAULT_WIDGET_IDS;
  const activeWidgets = widgetIds.filter((id) => WIDGET_REGISTRY.has(id));

  const lgLayout: Layout[] = [];
  let currentY = 0;

  for (const id of activeWidgets) {
    const widget = WIDGET_REGISTRY.get(id);
    if (!widget) continue;

    const { w, h } = widget.defaultSize;
    const minW = widget.minSize?.w ?? 2;
    const minH = widget.minSize?.h ?? 2;
    const maxW = widget.maxSize?.w;
    const maxH = widget.maxSize?.h;

    lgLayout.push({
      i: id,
      x: 0,
      y: currentY,
      w,
      h,
      minW,
      minH,
      ...(maxW !== undefined ? { maxW } : {}),
      ...(maxH !== undefined ? { maxH } : {}),
    });
    currentY += h;
  }

  // For smaller breakpoints, stack widgets at full available width
  const mdLayout = lgLayout.map((item) => {
    const widget = WIDGET_REGISTRY.get(item.i);
    return {
      ...item,
      w: Math.min(item.w, 10),
      minW: Math.min(widget?.minSize?.w ?? 2, 10),
    };
  });

  const smLayout = lgLayout.map((item) => ({
    ...item,
    x: 0,
    w: 6,
    minW: Math.min(item.minW ?? 2, 6),
  }));

  const xsLayout = lgLayout.map((item) => ({
    ...item,
    x: 0,
    w: 4,
    minW: Math.min(item.minW ?? 2, 4),
  }));

  const xxsLayout = lgLayout.map((item) => ({
    ...item,
    x: 0,
    w: 2,
    minW: Math.min(item.minW ?? 2, 2),
  }));

  return {
    layouts: {
      lg: lgLayout,
      md: mdLayout,
      sm: smLayout,
      xs: xsLayout,
      xxs: xxsLayout,
    },
    activeWidgets,
  };
}
