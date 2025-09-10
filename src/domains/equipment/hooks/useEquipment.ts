/**
 * Consolidated Equipment Hooks
 * Uses the new service architecture and hook factories
 * Follows SOLID principles with composition over inheritance
 */

import { useMemo } from 'react';
import { createQueryHook, createMutationHook, useCrudHooks } from '@/shared/base/BaseHook';
import { createEquipmentService, EquipmentService } from '../services/EquipmentService';
import { createEquipmentNotesService, EquipmentNotesService } from '../services/EquipmentNotesService';
import { 
  Equipment, 
  EnhancedEquipment, 
  CreateEquipmentData, 
  UpdateEquipmentData,
  EquipmentFilters,
  EquipmentStats,
  EquipmentSearchResult,
  EquipmentQRData
} from '../types/Equipment';
import { 
  EquipmentNote, 
  CreateEquipmentNoteData, 
  UpdateEquipmentNoteData 
} from '../types/Equipment';
import { ApiResponse } from '@/shared/types/common';

/**
 * Hook factory for equipment queries
 */
const createEquipmentQueryHook = (organizationId: string) => {
  const service = createEquipmentService(organizationId);
  
  return {
    useFilteredEquipment: createQueryHook(
      'equipment-filtered',
      (filters: EquipmentFilters) => service.getFilteredEquipment(filters)
    ),
    useEquipmentById: createQueryHook(
      'equipment-by-id',
      (equipmentId: string) => service.getEquipmentById(equipmentId)
    ),
    useSearchEquipment: createQueryHook(
      'equipment-search',
      (searchTerm: string) => service.searchEquipment(searchTerm)
    ),
    useEquipmentStats: createQueryHook(
      'equipment-stats',
      () => service.getEquipmentStats()
    ),
    useOverdueMaintenanceEquipment: createQueryHook(
      'overdue-maintenance-equipment',
      () => service.getOverdueMaintenanceEquipment()
    )
  };
};

/**
 * Hook factory for equipment mutations
 */
const createEquipmentMutationHook = (organizationId: string) => {
  const service = createEquipmentService(organizationId);
  
  return {
    useCreateEquipment: createMutationHook(
      service.createEquipment,
      {
        onSuccessMessage: 'Equipment created successfully',
        onErrorMessage: 'Failed to create equipment'
      }
    ),
    useUpdateEquipment: createMutationHook(
      ({ id, data }: { id: string; data: UpdateEquipmentData }) => 
        service.updateEquipment(id, data),
      {
        onSuccessMessage: 'Equipment updated successfully',
        onErrorMessage: 'Failed to update equipment'
      }
    ),
    useDeleteEquipment: createMutationHook(
      (id: string) => service.deleteEquipment(id),
      {
        onSuccessMessage: 'Equipment deleted successfully',
        onErrorMessage: 'Failed to delete equipment'
      }
    ),
    useUpdateMaintenanceSchedule: createMutationHook(
      ({ equipmentId, lastMaintenanceDate, nextMaintenanceDate }: {
        equipmentId: string;
        lastMaintenanceDate: string;
        nextMaintenanceDate: string;
      }) => service.updateMaintenanceSchedule(equipmentId, lastMaintenanceDate, nextMaintenanceDate),
      {
        onSuccessMessage: 'Maintenance schedule updated successfully',
        onErrorMessage: 'Failed to update maintenance schedule'
      }
    ),
    useGenerateQRCode: createMutationHook(
      (equipmentId: string) => service.generateQRCode(equipmentId),
      {
        onSuccessMessage: 'QR code generated successfully',
        onErrorMessage: 'Failed to generate QR code'
      }
    )
  };
};

/**
 * Hook factory for equipment notes queries
 */
const createEquipmentNotesQueryHook = (organizationId: string) => {
  const service = createEquipmentNotesService(organizationId);
  
  return {
    useEquipmentNotes: createQueryHook(
      'equipment-notes',
      (equipmentId: string) => service.getNotes(equipmentId)
    ),
    useEquipmentNotesWithDetails: createQueryHook(
      'equipment-notes-with-details',
      (equipmentId: string) => service.getEquipmentNotesWithDetails(equipmentId)
    ),
    useNotesByEquipmentType: createQueryHook(
      'notes-by-equipment-type',
      (equipmentType: string) => service.getNotesByEquipmentType(equipmentType)
    ),
    useMaintenanceNotes: createQueryHook(
      'maintenance-notes',
      (equipmentId?: string) => service.getMaintenanceNotes(equipmentId)
    ),
    useHighHoursNotes: createQueryHook(
      'high-hours-notes',
      (minHours: number) => service.getHighHoursNotes(minHours)
    ),
    useNotesStatsByEquipment: createQueryHook(
      'notes-stats-by-equipment',
      () => service.getNotesStatsByEquipment()
    ),
    useSearchNotesGlobally: createQueryHook(
      'search-notes-globally',
      (searchTerm: string) => service.searchNotesGlobally(searchTerm)
    )
  };
};

/**
 * Hook factory for equipment notes mutations
 */
const createEquipmentNotesMutationHook = (organizationId: string) => {
  const service = createEquipmentNotesService(organizationId);
  
  return {
    useCreateEquipmentNote: createMutationHook(
      ({ equipmentId, data }: { equipmentId: string; data: CreateEquipmentNoteData }) => 
        service.createNote(equipmentId, data),
      {
        onSuccessMessage: 'Note added successfully',
        onErrorMessage: 'Failed to add note'
      }
    ),
    useUpdateEquipmentNote: createMutationHook(
      ({ noteId, data }: { noteId: string; data: UpdateEquipmentNoteData }) => 
        service.updateNote(noteId, data),
      {
        onSuccessMessage: 'Note updated successfully',
        onErrorMessage: 'Failed to update note'
      }
    ),
    useDeleteEquipmentNote: createMutationHook(
      (noteId: string) => service.deleteNote(noteId),
      {
        onSuccessMessage: 'Note deleted successfully',
        onErrorMessage: 'Failed to delete note'
      }
    ),
    useAddEquipmentNoteImage: createMutationHook(
      ({ noteId, imageData }: { noteId: string; imageData: any }) => 
        service.addNoteImage(noteId, imageData),
      {
        onSuccessMessage: 'Image added successfully',
        onErrorMessage: 'Failed to add image'
      }
    ),
    useDeleteEquipmentNoteImage: createMutationHook(
      (imageId: string) => service.deleteNoteImage(imageId),
      {
        onSuccessMessage: 'Image deleted successfully',
        onErrorMessage: 'Failed to delete image'
      }
    )
  };
};

/**
 * Main hook for equipment operations
 */
export function useEquipment(organizationId: string) {
  const queryHooks = useMemo(() => createEquipmentQueryHook(organizationId), [organizationId]);
  const mutationHooks = useMemo(() => createEquipmentMutationHook(organizationId), [organizationId]);
  
  return {
    // Queries
    ...queryHooks,
    
    // Mutations
    ...mutationHooks
  };
}

/**
 * Main hook for equipment notes operations
 */
export function useEquipmentNotes(organizationId: string) {
  const queryHooks = useMemo(() => createEquipmentNotesQueryHook(organizationId), [organizationId]);
  const mutationHooks = useMemo(() => createEquipmentNotesMutationHook(organizationId), [organizationId]);
  
  return {
    // Queries
    ...queryHooks,
    
    // Mutations
    ...mutationHooks
  };
}

/**
 * Hook for equipment CRUD operations using the generic pattern
 */
export function useEquipmentCrud(organizationId: string) {
  const service = useMemo(() => createEquipmentService(organizationId), [organizationId]);
  
  return useCrudHooks('equipment', {
    findById: (id: string) => service.getEquipmentById(id).then(res => 
      res.success ? res.data : null
    ),
    findMany: (filters?: any) => service.getFilteredEquipment(filters || {}),
    create: (data: CreateEquipmentData) => service.createEquipment(data),
    update: (id: string, data: UpdateEquipmentData) => service.updateEquipment(id, data),
    delete: (id: string) => service.deleteEquipment(id)
  });
}

/**
 * Hook for equipment dashboard data
 */
export function useEquipmentDashboard(organizationId: string) {
  const equipment = useEquipment(organizationId);
  
  return {
    // Stats
    stats: equipment.useEquipmentStats(),
    
    // Overdue maintenance
    overdueMaintenance: equipment.useOverdueMaintenanceEquipment(),
    
    // Recent equipment (last 10)
    recentEquipment: equipment.useFilteredEquipment({})
  };
}

/**
 * Hook for equipment search
 */
export function useEquipmentSearch(organizationId: string) {
  const equipment = useEquipment(organizationId);
  
  return {
    searchEquipment: equipment.useSearchEquipment,
    searchResults: null // This would be managed by the component
  };
}

/**
 * Hook for equipment filters
 */
export function useEquipmentFilters(organizationId: string, initialFilters: EquipmentFilters = {}) {
  const equipment = useEquipment(organizationId);
  
  return {
    filteredEquipment: equipment.useFilteredEquipment(initialFilters),
    // Additional filter utilities would go here
  };
}

/**
 * Hook for equipment maintenance
 */
export function useEquipmentMaintenance(organizationId: string) {
  const equipment = useEquipment(organizationId);
  const notes = useEquipmentNotes(organizationId);
  
  return {
    // Maintenance schedule
    updateMaintenanceSchedule: equipment.useUpdateMaintenanceSchedule,
    
    // Maintenance notes
    maintenanceNotes: notes.useMaintenanceNotes,
    highHoursNotes: notes.useHighHoursNotes,
    
    // Overdue equipment
    overdueEquipment: equipment.useOverdueMaintenanceEquipment
  };
}

/**
 * Hook for equipment QR codes
 */
export function useEquipmentQR(organizationId: string) {
  const equipment = useEquipment(organizationId);
  
  return {
    generateQRCode: equipment.useGenerateQRCode
  };
}
