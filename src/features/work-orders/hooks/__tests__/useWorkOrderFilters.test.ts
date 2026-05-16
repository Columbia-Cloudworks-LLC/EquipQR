import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { addDays, startOfWeek } from 'date-fns';
import { useWorkOrderFilters } from '../useWorkOrderFilters';
import type { WorkOrderData } from '@/features/work-orders/types/workOrder';

const baseWorkOrder = (overrides: Partial<WorkOrderData> = {}): WorkOrderData =>
  ({
    id: 'wo-base',
    title: 'Base Work Order',
    description: '',
    equipmentId: 'eq-1',
    organizationId: 'org-1',
    status: 'submitted',
    priority: 'medium',
    createdDate: '2026-01-01T00:00:00Z',
    created_date: '2026-01-01T00:00:00Z',
    ...overrides,
  } as WorkOrderData);

describe('useWorkOrderFilters', () => {
  describe('teamFilter sentinels', () => {
    const workOrders: WorkOrderData[] = [
      baseWorkOrder({ id: 'wo-team-a', title: 'Team A WO', teamId: 'team-a' }),
      baseWorkOrder({ id: 'wo-team-b', title: 'Team B WO', teamId: 'team-b' }),
      baseWorkOrder({ id: 'wo-no-team', title: 'No Team WO', teamId: undefined }),
    ];

    it('returns every order when teamFilter is "all"', () => {
      const { result } = renderHook(() => useWorkOrderFilters(workOrders, 'user-1'));

      expect(result.current.filteredWorkOrders.map((o) => o.id).sort()).toEqual(
        ['wo-no-team', 'wo-team-a', 'wo-team-b'].sort(),
      );
    });

    it('returns only orders without a team when teamFilter is "unassigned"', () => {
      const { result } = renderHook(() => useWorkOrderFilters(workOrders, 'user-1'));

      act(() => {
        result.current.updateFilter('teamFilter', 'unassigned');
      });

      expect(result.current.filteredWorkOrders).toHaveLength(1);
      expect(result.current.filteredWorkOrders[0].id).toBe('wo-no-team');
    });

    it('returns only matching orders when teamFilter is a specific team id', () => {
      const { result } = renderHook(() => useWorkOrderFilters(workOrders, 'user-1'));

      act(() => {
        result.current.updateFilter('teamFilter', 'team-b');
      });

      expect(result.current.filteredWorkOrders).toHaveLength(1);
      expect(result.current.filteredWorkOrders[0].id).toBe('wo-team-b');
    });

    it('does NOT count teamFilter in the page-local active-filter count', () => {
      // Team scope is owned by the global TopBar `useSelectedTeam`, so a
      // non-default `teamFilter` value must not bump the page-local "active
      // filters" badge — that badge counts only filters the user can change
      // from the page.
      const { result } = renderHook(() => useWorkOrderFilters(workOrders, 'user-1'));

      act(() => {
        result.current.updateFilter('teamFilter', 'team-a');
      });

      expect(result.current.getActiveFilterCount()).toBe(0);

      act(() => {
        result.current.updateFilter('statusFilter', 'in_progress');
      });

      expect(result.current.getActiveFilterCount()).toBe(1);
    });
  });

  // ─── Shared fixture ─────────────────────────────────────────────────────────
  // Most suites below use the same six-work-order dataset. Each suite rebuilds
  // `orders` in beforeEach so tests remain independent.

  const CURRENT_USER = 'user-current';

  const makeOrder = (overrides: Partial<WorkOrderData> = {}): WorkOrderData =>
    ({
      id: 'wo-default',
      title: 'Default Work Order',
      description: '',
      equipmentId: 'eq-1',
      organizationId: 'org-1',
      status: 'submitted',
      priority: 'medium',
      createdDate: '2026-01-01T00:00:00Z',
      created_date: '2026-01-01T00:00:00Z',
      ...overrides,
    } as WorkOrderData);

  // ─── initial state ───────────────────────────────────────────────────────────
  describe('initial state', () => {
    it('returns all work orders when no filter is applied', () => {
      const orders = [makeOrder({ id: 'a' }), makeOrder({ id: 'b' })];
      const { result } = renderHook(() => useWorkOrderFilters(orders, CURRENT_USER));
      expect(result.current.filteredWorkOrders).toHaveLength(2);
    });

    it('exposes totalCount equal to the input array length', () => {
      const orders = [makeOrder(), makeOrder(), makeOrder()];
      const { result } = renderHook(() => useWorkOrderFilters(orders));
      expect(result.current.totalCount).toBe(3);
    });

    it('starts with empty activePresets', () => {
      const { result } = renderHook(() => useWorkOrderFilters([]));
      expect(result.current.activePresets.size).toBe(0);
    });

    it('starts with sortField "created" and sortDirection "desc"', () => {
      const { result } = renderHook(() => useWorkOrderFilters([]));
      expect(result.current.sortField).toBe('created');
      expect(result.current.sortDirection).toBe('desc');
    });

    it('returns 0 for getActiveFilterCount when all filters are default', () => {
      const { result } = renderHook(() => useWorkOrderFilters([]));
      expect(result.current.getActiveFilterCount()).toBe(0);
    });

    it('handles empty work-order array without error', () => {
      const { result } = renderHook(() => useWorkOrderFilters([]));
      expect(result.current.filteredWorkOrders).toEqual([]);
      expect(result.current.totalCount).toBe(0);
    });
  });

  // ─── search filter ───────────────────────────────────────────────────────────
  describe('search filter', () => {
    let orders: WorkOrderData[];
    beforeEach(() => {
      orders = [
        makeOrder({ id: 'wo-1', title: 'Engine Repair', assigneeName: 'Alice Smith', teamName: 'Alpha Team', equipmentName: 'Excavator' }),
        makeOrder({ id: 'wo-2', title: 'Oil Change', assigneeName: 'Bob Jones', teamName: 'Beta Team', equipmentName: 'Loader' }),
      ];
    });

    it('filters by title (case-insensitive)', () => {
      const { result } = renderHook(() => useWorkOrderFilters(orders, CURRENT_USER));
      act(() => { result.current.updateFilter('searchQuery', 'engine'); });
      expect(result.current.filteredWorkOrders).toHaveLength(1);
      expect(result.current.filteredWorkOrders[0].id).toBe('wo-1');
    });

    it('filters by assigneeName', () => {
      const { result } = renderHook(() => useWorkOrderFilters(orders, CURRENT_USER));
      act(() => { result.current.updateFilter('searchQuery', 'bob'); });
      expect(result.current.filteredWorkOrders).toHaveLength(1);
      expect(result.current.filteredWorkOrders[0].id).toBe('wo-2');
    });

    it('filters by teamName', () => {
      const { result } = renderHook(() => useWorkOrderFilters(orders, CURRENT_USER));
      act(() => { result.current.updateFilter('searchQuery', 'alpha'); });
      expect(result.current.filteredWorkOrders).toHaveLength(1);
      expect(result.current.filteredWorkOrders[0].id).toBe('wo-1');
    });

    it('filters by equipmentName', () => {
      const { result } = renderHook(() => useWorkOrderFilters(orders, CURRENT_USER));
      act(() => { result.current.updateFilter('searchQuery', 'loader'); });
      expect(result.current.filteredWorkOrders).toHaveLength(1);
      expect(result.current.filteredWorkOrders[0].id).toBe('wo-2');
    });

    it('returns all orders when query is cleared', () => {
      const { result } = renderHook(() => useWorkOrderFilters(orders, CURRENT_USER));
      act(() => { result.current.updateFilter('searchQuery', 'engine'); });
      act(() => { result.current.updateFilter('searchQuery', ''); });
      expect(result.current.filteredWorkOrders).toHaveLength(2);
    });

    it('returns empty array when no order matches the query', () => {
      const { result } = renderHook(() => useWorkOrderFilters(orders, CURRENT_USER));
      act(() => { result.current.updateFilter('searchQuery', 'zzz-no-match'); });
      expect(result.current.filteredWorkOrders).toHaveLength(0);
    });
  });

  // ─── status filter ───────────────────────────────────────────────────────────
  describe('statusFilter', () => {
    let orders: WorkOrderData[];
    beforeEach(() => {
      orders = [
        makeOrder({ id: 'open', status: 'submitted' }),
        makeOrder({ id: 'progress', status: 'in_progress' }),
        makeOrder({ id: 'done', status: 'completed' }),
      ];
    });

    it('returns only matching status when a specific status is selected', () => {
      const { result } = renderHook(() => useWorkOrderFilters(orders));
      act(() => { result.current.updateFilter('statusFilter', 'in_progress'); });
      expect(result.current.filteredWorkOrders).toHaveLength(1);
      expect(result.current.filteredWorkOrders[0].id).toBe('progress');
    });

    it('returns all orders when statusFilter is "all"', () => {
      const { result } = renderHook(() => useWorkOrderFilters(orders));
      act(() => { result.current.updateFilter('statusFilter', 'completed'); });
      act(() => { result.current.updateFilter('statusFilter', 'all'); });
      expect(result.current.filteredWorkOrders).toHaveLength(3);
    });

    it('counts statusFilter in getActiveFilterCount', () => {
      const { result } = renderHook(() => useWorkOrderFilters(orders));
      act(() => { result.current.updateFilter('statusFilter', 'submitted'); });
      expect(result.current.getActiveFilterCount()).toBe(1);
    });
  });

  // ─── assignee filter ─────────────────────────────────────────────────────────
  describe('assigneeFilter', () => {
    let orders: WorkOrderData[];
    beforeEach(() => {
      orders = [
        makeOrder({ id: 'mine', assigneeId: CURRENT_USER }),
        makeOrder({ id: 'other', assigneeId: 'user-other' }),
        makeOrder({ id: 'team-only', assigneeId: undefined, teamId: 'team-x' }),
        makeOrder({ id: 'unassigned', assigneeId: undefined, teamId: undefined }),
      ];
    });

    it('"mine" returns only orders assigned to the current user', () => {
      const { result } = renderHook(() => useWorkOrderFilters(orders, CURRENT_USER));
      act(() => { result.current.updateFilter('assigneeFilter', 'mine'); });
      expect(result.current.filteredWorkOrders).toHaveLength(1);
      expect(result.current.filteredWorkOrders[0].id).toBe('mine');
    });

    it('"unassigned" returns orders with no assigneeId and no teamId', () => {
      const { result } = renderHook(() => useWorkOrderFilters(orders, CURRENT_USER));
      act(() => { result.current.updateFilter('assigneeFilter', 'unassigned'); });
      expect(result.current.filteredWorkOrders).toHaveLength(1);
      expect(result.current.filteredWorkOrders[0].id).toBe('unassigned');
    });

    it('a specific assignee id returns only that user\'s orders', () => {
      const { result } = renderHook(() => useWorkOrderFilters(orders, CURRENT_USER));
      act(() => { result.current.updateFilter('assigneeFilter', 'user-other'); });
      expect(result.current.filteredWorkOrders).toHaveLength(1);
      expect(result.current.filteredWorkOrders[0].id).toBe('other');
    });
  });

  // ─── priority filter ─────────────────────────────────────────────────────────
  describe('priorityFilter', () => {
    let orders: WorkOrderData[];
    beforeEach(() => {
      orders = [
        makeOrder({ id: 'high', priority: 'high' }),
        makeOrder({ id: 'medium', priority: 'medium' }),
        makeOrder({ id: 'low', priority: 'low' }),
      ];
    });

    it('filters to only "high" priority orders', () => {
      const { result } = renderHook(() => useWorkOrderFilters(orders));
      act(() => { result.current.updateFilter('priorityFilter', 'high'); });
      expect(result.current.filteredWorkOrders).toHaveLength(1);
      expect(result.current.filteredWorkOrders[0].id).toBe('high');
    });

    it('returns all orders when priorityFilter is "all"', () => {
      const { result } = renderHook(() => useWorkOrderFilters(orders));
      act(() => { result.current.updateFilter('priorityFilter', 'low'); });
      act(() => { result.current.updateFilter('priorityFilter', 'all'); });
      expect(result.current.filteredWorkOrders).toHaveLength(3);
    });

    it('counts priorityFilter in getActiveFilterCount', () => {
      const { result } = renderHook(() => useWorkOrderFilters(orders));
      act(() => { result.current.updateFilter('priorityFilter', 'medium'); });
      expect(result.current.getActiveFilterCount()).toBe(1);
    });
  });

  // ─── due-date filter ─────────────────────────────────────────────────────────
  describe('dueDateFilter', () => {
    it('"overdue" returns orders with a past due date in non-terminal status', () => {
      const orders = [
        makeOrder({ id: 'overdue', dueDate: '2020-01-01', status: 'submitted' }),
        makeOrder({ id: 'completed-old', dueDate: '2020-01-01', status: 'completed' }),
        makeOrder({ id: 'no-due', dueDate: undefined, status: 'submitted' }),
      ];
      const { result } = renderHook(() => useWorkOrderFilters(orders));
      act(() => { result.current.updateFilter('dueDateFilter', 'overdue'); });
      expect(result.current.filteredWorkOrders).toHaveLength(1);
      expect(result.current.filteredWorkOrders[0].id).toBe('overdue');
    });

    it('"today" returns orders due on today\'s date', () => {
      const todayStr = new Date().toISOString().split('T')[0];
      const orders = [
        makeOrder({ id: 'today', dueDate: todayStr }),
        makeOrder({ id: 'past', dueDate: '2020-06-15' }),
        makeOrder({ id: 'no-due' }),
      ];
      const { result } = renderHook(() => useWorkOrderFilters(orders));
      act(() => { result.current.updateFilter('dueDateFilter', 'today'); });
      expect(result.current.filteredWorkOrders).toHaveLength(1);
      expect(result.current.filteredWorkOrders[0].id).toBe('today');
    });

    it('"this_week" returns orders due within the current week', () => {
      const midWeekStr = addDays(startOfWeek(new Date()), 3).toISOString().split('T')[0];
      const orders = [
        makeOrder({ id: 'this-week', dueDate: midWeekStr }),
        makeOrder({ id: 'old', dueDate: '2020-01-01' }),
        makeOrder({ id: 'no-due' }),
      ];
      const { result } = renderHook(() => useWorkOrderFilters(orders));
      act(() => { result.current.updateFilter('dueDateFilter', 'this_week'); });
      const ids = result.current.filteredWorkOrders.map((o) => o.id);
      expect(ids).toContain('this-week');
      expect(ids).not.toContain('old');
    });

    it('counts dueDateFilter in getActiveFilterCount', () => {
      const { result } = renderHook(() => useWorkOrderFilters([]));
      act(() => { result.current.updateFilter('dueDateFilter', 'overdue'); });
      expect(result.current.getActiveFilterCount()).toBe(1);
    });
  });

  // ─── sorting ─────────────────────────────────────────────────────────────────
  describe('sorting', () => {
    let orders: WorkOrderData[];
    beforeEach(() => {
      orders = [
        makeOrder({ id: 'c', priority: 'low',    status: 'completed', createdDate: '2026-01-03T00:00:00Z', created_date: '2026-01-03T00:00:00Z', dueDate: '2026-03-01' }),
        makeOrder({ id: 'a', priority: 'high',   status: 'submitted', createdDate: '2026-01-01T00:00:00Z', created_date: '2026-01-01T00:00:00Z', dueDate: '2026-01-01' }),
        makeOrder({ id: 'b', priority: 'medium', status: 'in_progress', createdDate: '2026-01-02T00:00:00Z', created_date: '2026-01-02T00:00:00Z', dueDate: '2026-02-01' }),
      ];
    });

    it('default sort is by createdDate descending', () => {
      const { result } = renderHook(() => useWorkOrderFilters(orders));
      const ids = result.current.filteredWorkOrders.map((o) => o.id);
      expect(ids).toEqual(['c', 'b', 'a']);
    });

    it('sorts by createdDate ascending when direction is asc', () => {
      const { result } = renderHook(() => useWorkOrderFilters(orders));
      act(() => { result.current.updateSort('created', 'asc'); });
      const ids = result.current.filteredWorkOrders.map((o) => o.id);
      expect(ids).toEqual(['a', 'b', 'c']);
    });

    it('sorts by dueDate ascending', () => {
      const { result } = renderHook(() => useWorkOrderFilters(orders));
      act(() => { result.current.updateSort('due_date', 'asc'); });
      const ids = result.current.filteredWorkOrders.map((o) => o.id);
      expect(ids).toEqual(['a', 'b', 'c']);
    });

    it('sorts by dueDate descending', () => {
      const { result } = renderHook(() => useWorkOrderFilters(orders));
      act(() => { result.current.updateSort('due_date', 'desc'); });
      const ids = result.current.filteredWorkOrders.map((o) => o.id);
      expect(ids).toEqual(['c', 'b', 'a']);
    });

    it('places orders with no dueDate last when sorting by due_date', () => {
      const ordersWithNull = [
        makeOrder({ id: 'no-due', dueDate: undefined }),
        makeOrder({ id: 'has-due', dueDate: '2026-01-15' }),
      ];
      const { result } = renderHook(() => useWorkOrderFilters(ordersWithNull));
      act(() => { result.current.updateSort('due_date', 'asc'); });
      const ids = result.current.filteredWorkOrders.map((o) => o.id);
      expect(ids).toEqual(['has-due', 'no-due']);
    });

    it('sorts by priority ascending (low → medium → high)', () => {
      const { result } = renderHook(() => useWorkOrderFilters(orders));
      act(() => { result.current.updateSort('priority', 'asc'); });
      const ids = result.current.filteredWorkOrders.map((o) => o.id);
      expect(ids).toEqual(['c', 'b', 'a']);
    });

    it('sorts by priority descending (high → medium → low)', () => {
      const { result } = renderHook(() => useWorkOrderFilters(orders));
      act(() => { result.current.updateSort('priority', 'desc'); });
      const ids = result.current.filteredWorkOrders.map((o) => o.id);
      expect(ids).toEqual(['a', 'b', 'c']);
    });

    it('sorts by status ascending (submitted → in_progress → completed)', () => {
      const { result } = renderHook(() => useWorkOrderFilters(orders));
      act(() => { result.current.updateSort('status', 'asc'); });
      const ids = result.current.filteredWorkOrders.map((o) => o.id);
      expect(ids).toEqual(['a', 'b', 'c']);
    });

    it('sorts by status descending', () => {
      const { result } = renderHook(() => useWorkOrderFilters(orders));
      act(() => { result.current.updateSort('status', 'desc'); });
      const ids = result.current.filteredWorkOrders.map((o) => o.id);
      expect(ids).toEqual(['c', 'b', 'a']);
    });
  });

  // ─── updateSort toggle behaviour ─────────────────────────────────────────────
  describe('updateSort (toggle behaviour)', () => {
    it('toggles direction when called with the same field and no explicit direction', () => {
      const { result } = renderHook(() => useWorkOrderFilters([]));
      // Default is created/desc — calling updateSort('created') should flip to asc
      act(() => { result.current.updateSort('created'); });
      expect(result.current.sortDirection).toBe('asc');
    });

    it('sets default "desc" direction when switching to a non-due_date field', () => {
      const { result } = renderHook(() => useWorkOrderFilters([]));
      act(() => { result.current.updateSort('priority'); });
      expect(result.current.sortField).toBe('priority');
      expect(result.current.sortDirection).toBe('desc');
    });

    it('sets default "asc" direction when switching to due_date field', () => {
      const { result } = renderHook(() => useWorkOrderFilters([]));
      act(() => { result.current.updateSort('due_date'); });
      expect(result.current.sortField).toBe('due_date');
      expect(result.current.sortDirection).toBe('asc');
    });
  });

  // ─── clearAllFilters ─────────────────────────────────────────────────────────
  describe('clearAllFilters', () => {
    it('resets all filters to their default values', () => {
      const { result } = renderHook(() => useWorkOrderFilters([]));
      act(() => {
        result.current.updateFilter('statusFilter', 'completed');
        result.current.updateFilter('priorityFilter', 'high');
        result.current.updateFilter('searchQuery', 'test');
      });
      act(() => { result.current.clearAllFilters(); });
      expect(result.current.filters.statusFilter).toBe('all');
      expect(result.current.filters.priorityFilter).toBe('all');
      expect(result.current.filters.searchQuery).toBe('');
      expect(result.current.getActiveFilterCount()).toBe(0);
    });

    it('clears all active presets', () => {
      const { result } = renderHook(() => useWorkOrderFilters([]));
      act(() => { result.current.toggleQuickFilter('urgent'); });
      expect(result.current.activePresets.size).toBe(1);
      act(() => { result.current.clearAllFilters(); });
      expect(result.current.activePresets.size).toBe(0);
    });
  });

  // ─── toggleQuickFilter ───────────────────────────────────────────────────────
  describe('toggleQuickFilter', () => {
    it('"my-work" sets assigneeFilter to "mine"', () => {
      const { result } = renderHook(() => useWorkOrderFilters([]));
      act(() => { result.current.toggleQuickFilter('my-work'); });
      expect(result.current.filters.assigneeFilter).toBe('mine');
      expect(result.current.activePresets.has('my-work')).toBe(true);
    });

    it('"urgent" sets priorityFilter to "high"', () => {
      const { result } = renderHook(() => useWorkOrderFilters([]));
      act(() => { result.current.toggleQuickFilter('urgent'); });
      expect(result.current.filters.priorityFilter).toBe('high');
      expect(result.current.activePresets.has('urgent')).toBe(true);
    });

    it('"overdue" sets dueDateFilter to "overdue"', () => {
      const { result } = renderHook(() => useWorkOrderFilters([]));
      act(() => { result.current.toggleQuickFilter('overdue'); });
      expect(result.current.filters.dueDateFilter).toBe('overdue');
      expect(result.current.activePresets.has('overdue')).toBe(true);
    });

    it('"unassigned" sets assigneeFilter to "unassigned"', () => {
      const { result } = renderHook(() => useWorkOrderFilters([]));
      act(() => { result.current.toggleQuickFilter('unassigned'); });
      expect(result.current.filters.assigneeFilter).toBe('unassigned');
      expect(result.current.activePresets.has('unassigned')).toBe(true);
    });

    it('deactivating the same preset clears the filter and empties activePresets', () => {
      const { result } = renderHook(() => useWorkOrderFilters([]));
      act(() => { result.current.toggleQuickFilter('urgent'); });
      expect(result.current.activePresets.has('urgent')).toBe(true);
      act(() => { result.current.toggleQuickFilter('urgent'); });
      expect(result.current.activePresets.has('urgent')).toBe(false);
      expect(result.current.filters.priorityFilter).toBe('all');
    });

    it('switching presets replaces the active preset (only one at a time)', () => {
      const { result } = renderHook(() => useWorkOrderFilters([]));
      act(() => { result.current.toggleQuickFilter('my-work'); });
      act(() => { result.current.toggleQuickFilter('urgent'); });
      expect(result.current.activePresets.has('my-work')).toBe(false);
      expect(result.current.activePresets.has('urgent')).toBe(true);
    });
  });

  // ─── updateFilter deactivates presets ────────────────────────────────────────
  describe('updateFilter deactivates matching presets', () => {
    it('deactivates "urgent" preset when priorityFilter is changed away from "high"', () => {
      const { result } = renderHook(() => useWorkOrderFilters([]));
      act(() => { result.current.toggleQuickFilter('urgent'); });
      expect(result.current.activePresets.has('urgent')).toBe(true);
      act(() => { result.current.updateFilter('priorityFilter', 'low'); });
      expect(result.current.activePresets.has('urgent')).toBe(false);
    });

    it('keeps the preset active when the filter value matches the preset value', () => {
      const { result } = renderHook(() => useWorkOrderFilters([]));
      act(() => { result.current.toggleQuickFilter('urgent'); });
      // Setting priorityFilter to 'high' again — preset should stay active
      act(() => { result.current.updateFilter('priorityFilter', 'high'); });
      expect(result.current.activePresets.has('urgent')).toBe(true);
    });
  });

  // ─── combined filter + sort ───────────────────────────────────────────────────
  describe('combined filter and sort', () => {
    it('sorts the filtered subset, not the entire array', () => {
      const orders = [
        makeOrder({ id: 'high-new', priority: 'high', status: 'submitted', createdDate: '2026-01-03T00:00:00Z', created_date: '2026-01-03T00:00:00Z' }),
        makeOrder({ id: 'high-old', priority: 'high', status: 'submitted', createdDate: '2026-01-01T00:00:00Z', created_date: '2026-01-01T00:00:00Z' }),
        makeOrder({ id: 'low-mid',  priority: 'low',  status: 'submitted', createdDate: '2026-01-02T00:00:00Z', created_date: '2026-01-02T00:00:00Z' }),
      ];
      const { result } = renderHook(() => useWorkOrderFilters(orders));
      act(() => {
        result.current.updateFilter('priorityFilter', 'high');
        result.current.updateSort('created', 'asc');
      });
      const ids = result.current.filteredWorkOrders.map((o) => o.id);
      expect(ids).toEqual(['high-old', 'high-new']);
    });
  });
});
