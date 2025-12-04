import { useState, useMemo, useCallback } from 'react';
import { useEquipment } from '@/hooks/useEquipment';
import { useTeams } from '@/hooks/useTeamManagement';
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

export const useEquipmentFiltering = (organizationId?: string) => {
  const [filters, setFilters] = useState<EquipmentFilters>(initialFilters);
  const [sortConfig, setSortConfig] = useState<SortConfig>(initialSort);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10); // Default to 10 items per page

  // Get equipment data using explicit organization ID
  const { data: equipment = [], isLoading } = useEquipment(organizationId);
  const { data: teams = [] } = useTeams(organizationId);
  usePermissions();

  // Extract unique values for filter options
  const filterOptions = useMemo(() => {
    const manufacturers = [...new Set(equipment.map(item => item.manufacturer))].sort();
    const locations = [...new Set(equipment.map(item => item.location))].sort();
    
    return {
      manufacturers,
      locations,
      teams: teams.map(team => ({ id: team.id, name: team.name }))
    } as const;
  }, [equipment, teams]);

  // Filter and sort equipment
  const filteredAndSortedEquipment = useMemo(() => {
    const filtered = equipment.filter(item => {
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const searchMatch = 
          item.name.toLowerCase().includes(searchLower) ||
          item.manufacturer.toLowerCase().includes(searchLower) ||
          item.model.toLowerCase().includes(searchLower) ||
          item.serial_number.toLowerCase().includes(searchLower) ||
          item.location.toLowerCase().includes(searchLower);
        
        if (!searchMatch) return false;
      }

      // Status filter
      if (filters.status !== 'all' && item.status !== filters.status) {
        return false;
      }

      // Manufacturer filter
      if (filters.manufacturer !== 'all' && item.manufacturer !== filters.manufacturer) {
        return false;
      }

      // Location filter
      if (filters.location !== 'all' && item.location !== filters.location) {
        return false;
      }

      // Team filter
      if (filters.team !== 'all') {
        if (filters.team === 'unassigned' && item.team_id) {
          return false;
        }
        if (filters.team !== 'unassigned' && item.team_id !== filters.team) {
          return false;
        }
      }

      // Maintenance date range filter
      if (filters.maintenanceDateFrom || filters.maintenanceDateTo) {
        if (!item.last_maintenance) return false;
        
        const maintenanceDate = new Date(item.last_maintenance);
        
        if (filters.maintenanceDateFrom) {
          const fromDate = new Date(filters.maintenanceDateFrom);
          if (maintenanceDate < fromDate) return false;
        }
        
        if (filters.maintenanceDateTo) {
          const toDate = new Date(filters.maintenanceDateTo);
          if (maintenanceDate > toDate) return false;
        }
      }

      // Installation date range filter
      if (filters.installationDateFrom || filters.installationDateTo) {
        const installationDate = new Date(item.installation_date);
        
        if (filters.installationDateFrom) {
          const fromDate = new Date(filters.installationDateFrom);
          if (installationDate < fromDate) return false;
        }
        
        if (filters.installationDateTo) {
          const toDate = new Date(filters.installationDateTo);
          if (installationDate > toDate) return false;
        }
      }

      // Warranty expiring filter
      if (filters.warrantyExpiring) {
        if (!item.warranty_expiration) return false;
        
        const warrantyDate = new Date(item.warranty_expiration);
        const now = new Date();
        const thirtyDaysFromNow = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000));
        
        if (warrantyDate > thirtyDaysFromNow) return false;
      }

      return true;
    });

    // Sort equipment
    filtered.sort((a, b) => {
      let aValue: unknown = a[sortConfig.field as keyof typeof a];
      let bValue: unknown = b[sortConfig.field as keyof typeof b];

      // Handle null/undefined values
      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return sortConfig.direction === 'asc' ? 1 : -1;
      if (bValue == null) return sortConfig.direction === 'asc' ? -1 : 1;

      // Handle date fields
      if (['installation_date', 'last_maintenance', 'warranty_expiration', 'created_at', 'updated_at'].includes(sortConfig.field)) {
        aValue = new Date(aValue as string).getTime();
        bValue = new Date(bValue as string).getTime();
      }

      // Handle string comparison
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        const aStr = aValue.toLowerCase();
        const bStr = bValue.toLowerCase();
        if (aStr < bStr) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aStr > bStr) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      }

      const aNum = Number(aValue);
      const bNum = Number(bValue);
      if (!Number.isNaN(aNum) && !Number.isNaN(bNum)) {
        if (aNum < bNum) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aNum > bNum) return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });

    return filtered;
  }, [equipment, filters, sortConfig]);

  // Paginate the filtered and sorted equipment
  const paginatedEquipment = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredAndSortedEquipment.slice(startIndex, endIndex);
  }, [filteredAndSortedEquipment, currentPage, pageSize]);

  // Quick filter presets
  const applyQuickFilter = useCallback((type: string) => {
    switch (type) {
      case 'maintenance-due':
        setFilters(prev => ({
          ...prev,
          status: 'maintenance'
        }));
        break;
      case 'warranty-expiring':
        setFilters(prev => ({
          ...prev,
          warrantyExpiring: true
        }));
        break;
      case 'recently-added':
        setSortConfig({
          field: 'created_at',
          direction: 'desc'
        });
        break;
      case 'active-only':
        setFilters(prev => ({
          ...prev,
          status: 'active'
        }));
        break;
    }
    setCurrentPage(1);
  }, []);

  const updateFilter = useCallback((key: keyof EquipmentFilters, value: EquipmentFilters[keyof EquipmentFilters]) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
    if (currentPage !== 1) {
      setCurrentPage(1);
    }
  }, [currentPage]);

  const updateSort = useCallback((field: string) => {
    setSortConfig(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
    if (currentPage !== 1) {
      setCurrentPage(1);
    }
  }, [currentPage]);

  const clearFilters = useCallback(() => {
    setFilters(initialFilters);
    setSortConfig(initialSort);
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

  const totalPages = Math.ceil(filteredAndSortedEquipment.length / pageSize);

  return {
    filters,
    sortConfig,
    showAdvancedFilters,
    filteredAndSortedEquipment, // Full filtered list for counts
    paginatedEquipment, // Current page of equipment
    filterOptions,
    isLoading,
    hasActiveFilters,
    equipment, // Return raw equipment data
    currentPage,
    pageSize,
    totalPages,
    totalFilteredCount: filteredAndSortedEquipment.length,
    updateFilter,
    updateSort,
    clearFilters,
    applyQuickFilter,
    setCurrentPage,
    setPageSize,
    setShowAdvancedFilters
  };
};