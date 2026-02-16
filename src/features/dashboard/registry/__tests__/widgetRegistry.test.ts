import { describe, it, expect } from 'vitest';
import {
  getWidget,
  getAllWidgets,
  getWidgetsByCategory,
  generateDefaultLayout,
  WIDGET_REGISTRY,
  DEFAULT_WIDGET_IDS,
} from '../widgetRegistry';

describe('widgetRegistry', () => {
  describe('getWidget', () => {
    it('returns a widget definition for a valid id', () => {
      const widget = getWidget('stats-grid');
      expect(widget).toBeDefined();
      expect(widget?.id).toBe('stats-grid');
      expect(widget?.title).toBe('Key Metrics');
      expect(widget?.category).toBe('overview');
    });

    it('returns undefined for an unknown id', () => {
      expect(getWidget('does-not-exist')).toBeUndefined();
    });

    it('returns correct definition for each registered widget', () => {
      for (const id of DEFAULT_WIDGET_IDS) {
        const widget = getWidget(id);
        expect(widget).toBeDefined();
        expect(widget?.id).toBe(id);
      }
    });
  });

  describe('getAllWidgets', () => {
    it('returns all registered widgets as an array', () => {
      const widgets = getAllWidgets();
      expect(widgets).toHaveLength(WIDGET_REGISTRY.size);
      expect(widgets.length).toBe(9); // 5 original + 4 Phase 2
    });

    it('each widget has required fields', () => {
      for (const widget of getAllWidgets()) {
        expect(widget.id).toBeTruthy();
        expect(widget.title).toBeTruthy();
        expect(widget.description).toBeTruthy();
        expect(widget.icon).toBeDefined();
        expect(widget.component).toBeDefined();
        expect(widget.defaultSize).toBeDefined();
        expect(widget.defaultSize.w).toBeGreaterThan(0);
        expect(widget.defaultSize.h).toBeGreaterThan(0);
        expect(widget.category).toBeTruthy();
      }
    });
  });

  describe('getWidgetsByCategory', () => {
    it('returns overview widgets (stats-grid, fleet-efficiency, quick-actions)', () => {
      const overview = getWidgetsByCategory('overview');
      expect(overview.length).toBe(3);
      expect(overview.every((w) => w.category === 'overview')).toBe(true);
    });

    it('returns work-orders widgets', () => {
      const wo = getWidgetsByCategory('work-orders');
      expect(wo.length).toBeGreaterThanOrEqual(2);
      expect(wo.every((w) => w.category === 'work-orders')).toBe(true);
    });

    it('returns equipment widgets', () => {
      const eq = getWidgetsByCategory('equipment');
      expect(eq.length).toBeGreaterThanOrEqual(2);
      expect(eq.every((w) => w.category === 'equipment')).toBe(true);
    });

    it('returns empty array for a category with no widgets', () => {
      const inv = getWidgetsByCategory('inventory');
      expect(inv).toEqual([]);
    });
  });

  describe('generateDefaultLayout', () => {
    it('generates layouts for all default widgets', () => {
      const { layouts, activeWidgets } = generateDefaultLayout();

      expect(activeWidgets).toEqual(DEFAULT_WIDGET_IDS);
      expect(layouts.lg).toHaveLength(DEFAULT_WIDGET_IDS.length);
      expect(layouts.md).toHaveLength(DEFAULT_WIDGET_IDS.length);
      expect(layouts.sm).toHaveLength(DEFAULT_WIDGET_IDS.length);
      expect(layouts.xs).toHaveLength(DEFAULT_WIDGET_IDS.length);
      expect(layouts.xxs).toHaveLength(DEFAULT_WIDGET_IDS.length);
    });

    it('assigns valid grid positions (y increases)', () => {
      const { layouts } = generateDefaultLayout();
      const lgLayout = layouts.lg;

      for (let i = 1; i < lgLayout.length; i++) {
        expect(lgLayout[i].y).toBeGreaterThanOrEqual(lgLayout[i - 1].y);
      }
    });

    it('generates layout for custom widget list', () => {
      const { layouts, activeWidgets } = generateDefaultLayout(['stats-grid', 'fleet-efficiency']);

      expect(activeWidgets).toEqual(['stats-grid', 'fleet-efficiency']);
      expect(layouts.lg).toHaveLength(2);
    });

    it('filters out unknown widget IDs', () => {
      const { activeWidgets } = generateDefaultLayout(['stats-grid', 'fake-widget', 'fleet-efficiency']);

      expect(activeWidgets).toEqual(['stats-grid', 'fleet-efficiency']);
    });

    it('each layout item has minW and minH constraints', () => {
      const { layouts } = generateDefaultLayout();

      for (const item of layouts.lg) {
        expect(item.minW).toBeDefined();
        expect(item.minH).toBeDefined();
        expect(item.minW).toBeGreaterThan(0);
        expect(item.minH).toBeGreaterThan(0);
      }
    });

    it('sm/xs/xxs breakpoints stack at full available width', () => {
      const { layouts } = generateDefaultLayout();

      for (const item of layouts.sm) {
        expect(item.w).toBe(6);
        expect(item.x).toBe(0);
      }
      for (const item of layouts.xs) {
        expect(item.w).toBe(4);
        expect(item.x).toBe(0);
      }
      for (const item of layouts.xxs) {
        expect(item.w).toBe(2);
        expect(item.x).toBe(0);
      }
    });
  });
});
