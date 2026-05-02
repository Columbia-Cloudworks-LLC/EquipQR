import { useState, useMemo, useCallback, useRef } from 'react';
import { useEquipmentList, useEquipmentSummaries } from '@/features/equipment/hooks/useEquipment';
import type { EquipmentListFilters } from '@/features/equipment/services/EquipmentService';
import { usePermissions } from '@/hooks/usePermissions';

export interface EquipmentFilters {
  search: string;
  status: string;
  manufacturer: string;
  location: string;
  team: string;
  maintenanceDateFrom: string;
  maintenanceDateTo: string;
  installationDateFrom: string;
  installationDateTo: string;
  warrantyExpiring: boolean;
}

export interface SortConfig {
  field: string;
  direction: 'asc' | 'desc';
}

const initialFilters: EquipmentFilters = {
  search: '',
  status: 'all',
  manufacturer: 'all',
  location: 'all',
  team: 'all',
  maintenanceDateFrom: '',
  maintenanceDateTo: '',
  installationDateFrom: '',
  installationDateTo: '',
  warrantyExpiring: false
};

const initialSort: SortConfig = {
  field: 'name',
  direction: 'asc'
};

/**
 * Equipment list state: filters, sort, pagination — all driven server-side
 * via `useEquipmentList`. The previous implementation pulled the entire
 * org into the browser and filtered/sorted/paginated in `useMemo`, which
 * shipped megabytes of unused rows on Slow 4G; this version ships only
 * the rows the page is rendering.
 *
 * Filter dropdown options (manufacturers, locations) are derived from the
 * lightweight `useEquipmentSummaries` projection, which is also the
 * source of `equipment.length` (the org-wide total). Both queries cache
 * independently of the paginated rows so toggling filters does not
 * re-fetch the option lists.
 */
export const useEquipmentFiltering = (organizationId?: string) => {
  const [filters, setFilters] = useState<EquipmentFilters>(initialFilters);
  const [sortConfig, setSortConfig] = useState<SortConfig>(initialSort);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [activeQuickFilter, setActiveQuickFilter] = useState<string | null>(null);

  // Refs mirror latest filter/sort state so callbacks stay stable (no
  // `currentPage` in deps) while still detecting true no-ops.
  const filtersRef = useRef(filters);
  filtersRef.current = filters;
  const sortConfigRef = useRef(sortConfig);
  sortConfigRef.current = sortConfig;

  // Server-side filtered + paginated rows. Filter shape is normalized so
  // the service can map `'all'` / `'unassigned'` sentinels and synthetic
  // `'out_of_service'` directly to PostgREST predicates.
  const serverFilters: EquipmentListFilters = useMemo(
    () => ({
      search: filters.search || undefined,
      status:
        filters.status === 'all'
          ? undefined
          : (filters.status as EquipmentListFilters['status']),
      manufacturer: filters.manufacturer === 'all' ? undefined : filters.manufacturer,
      location: filters.location === 'all' ? undefined : filters.location,
      team: filters.team === 'all' ? undefined : filters.team,
      maintenanceDateFrom: filters.maintenanceDateFrom || undefined,
      maintenanceDateTo: filters.maintenanceDateTo || undefined,
      installationDateFrom: filters.installationDateFrom || undefined,
      installationDateTo: filters.installationDateTo || undefined,
      warrantyExpiring: filters.warrantyExpiring || undefined,
    }),
    [filters],
  );

  const listQuery = useEquipmentList(organizationId, serverFilters, {
    page: currentPage,
    pageSize,
    sortField: sortConfig.field,
    sortDirection: sortConfig.direction,
  });

  // Lightweight org-wide summary used for filter dropdown options and
  // "X of N" totals. The query is cheap enough to keep separate from the
  // paginated list — PMs and dropdowns share the same cache entry.
  const summariesQuery = useEquipmentSummaries(organizationId);

  usePermissions();

  const equipment = useMemo(
    () => summariesQuery.data ?? [],
    [summariesQuery.data],
  );
  const paginatedEquipment = useMemo(
    () => listQuery.data?.data ?? [],
    [listQuery.data],
  );
  const totalFilteredCount = listQuery.data?.count ?? 0;
  const isLoading =
    listQuery.isLoading ||
    (summariesQuery.isLoading && !summariesQuery.data);

  // Filter option sources. Filter empty strings so the Radix Select doesn't
  // crash on an empty value.
  const filterOptions = useMemo(() => {
    const manufacturers = [...new Set(equipment.map(item => item.manufacturer ?? ''))]
      .filter(m => m && m.trim() !== '')
      .sort();
    const locations = [...new Set(equipment.map(item => item.location ?? ''))]
      .filter(l => l && l.trim() !== '')
      .sort();
    return { manufacturers, locations } as const;
  }, [equipment]);

  // For consumers that previously read `filteredAndSortedEquipment` to
  // count the filtered total, route them through the server count.
  const filteredAndSortedEquipment = paginatedEquipment;

  const applyQuickFilter = useCallback((type: string) => {
    if (activeQuickFilter === type) {
      setFilters(initialFilters);
      setSortConfig(initialSort);
      setActiveQuickFilter(null);
      setCurrentPage(1);
      return;
    }

    setFilters(initialFilters);
    setSortConfig(initialSort);

    switch (type) {
      case 'maintenance-due':
        setFilters(prev => ({ ...prev, status: 'maintenance' }));
        break;
      case 'warranty-expiring':
        setFilters(prev => ({ ...prev, warrantyExpiring: true }));
        break;
      case 'recently-added':
        setSortConfig({ field: 'created_at', direction: 'desc' });
        break;
      case 'active-only':
        setFilters(prev => ({ ...prev, status: 'active' }));
        break;
    }
    setActiveQuickFilter(type);
    setCurrentPage(1);
  }, [activeQuickFilter]);

  const updateFilter = useCallback(
    (key: keyof EquipmentFilters, value: EquipmentFilters[keyof EquipmentFilters]) => {
      if (filtersRef.current[key] === value) return;
      setFilters(prev => ({ ...prev, [key]: value }));
      setActiveQuickFilter(null);
      setCurrentPage(1);
    },
    [],
  );

  const updateSort = useCallback((field: string, direction?: 'asc' | 'desc') => {
    const prev = sortConfigRef.current;
    const nextDirection =
      direction ?? (prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc');
    if (prev.field === field && prev.direction === nextDirection) return;
    setSortConfig({ field, direction: nextDirection });
    setCurrentPage(1);
  }, []);

  const clearFilters = useCallback(() => {
    setFilters(initialFilters);
    setSortConfig(initialSort);
    setActiveQuickFilter(null);
    setCurrentPage(1);
  }, []);

  const hasActiveFilters = useMemo(() => {
    return Object.entries(filters).some(([key, value]) => {
      if (key === 'search' || key === 'maintenanceDateFrom' || key === 'maintenanceDateTo' ||
          key === 'installationDateFrom' || key === 'installationDateTo') {
        return value !== '';
      }
      if (key === 'warrantyExpiring') {
        return value === true;
      }
      return value !== 'all';
    });
  }, [filters]);

  const totalPages = Math.max(1, Math.ceil(totalFilteredCount / pageSize));

  return {
    filters,
    sortConfig,
    showAdvancedFilters,
    filteredAndSortedEquipment,
    paginatedEquipment,
    filterOptions,
    isLoading,
    hasActiveFilters,
    activeQuickFilter,
    equipment,
    currentPage,
    pageSize,
    totalPages,
    totalFilteredCount,
    updateFilter,
    updateSort,
    clearFilters,
    applyQuickFilter,
    setCurrentPage,
    setPageSize,
    setShowAdvancedFilters,
  };
};
