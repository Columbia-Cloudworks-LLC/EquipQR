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
    it('generates active widgets for all default widgets', () => {
      const { activeWidgets } = generateDefaultLayout();

      expect(activeWidgets).toEqual(DEFAULT_WIDGET_IDS);
      expect(activeWidgets).toHaveLength(DEFAULT_WIDGET_IDS.length);
    });

    it('generates layout for custom widget list', () => {
      const { activeWidgets } = generateDefaultLayout(['stats-grid', 'fleet-efficiency']);

      expect(activeWidgets).toEqual(['stats-grid', 'fleet-efficiency']);
      expect(activeWidgets).toHaveLength(2);
    });

    it('filters out unknown widget IDs', () => {
      const { activeWidgets } = generateDefaultLayout(['stats-grid', 'fake-widget', 'fleet-efficiency']);

      expect(activeWidgets).toEqual(['stats-grid', 'fleet-efficiency']);
    });

    it('returns only widget IDs registered in the registry', () => {
      const { activeWidgets } = generateDefaultLayout();

      for (const id of activeWidgets) {
        expect(WIDGET_REGISTRY.has(id)).toBe(true);
      }
    });

    it('returns an array of active widget IDs in display order', () => {
      const { activeWidgets } = generateDefaultLayout(['stats-grid', 'fleet-efficiency', 'recent-equipment']);

      expect(activeWidgets).toEqual(['stats-grid', 'fleet-efficiency', 'recent-equipment']);
    });

    it('returns empty activeWidgets when no valid IDs provided', () => {
      const { activeWidgets } = generateDefaultLayout(['fake-1', 'fake-2']);

      expect(activeWidgets).toEqual([]);
    });
  });
});
