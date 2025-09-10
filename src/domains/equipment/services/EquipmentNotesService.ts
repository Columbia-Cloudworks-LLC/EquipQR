/**
 * Consolidated Equipment Notes Service
 * Merges equipmentNotesService.ts and optimizedEquipmentNotesService.ts
 * Extends the generic NotesService pattern
 */

import { NotesService } from '@/shared/services/NotesService';
import { BaseRepository } from '@/shared/base/BaseRepository';
import { supabase } from '@/integrations/supabase/client';
import { 
  EquipmentNote, 
  EquipmentNoteImage,
  CreateEquipmentNoteData, 
  UpdateEquipmentNoteData 
} from '../types/Equipment';
import { ApiResponse, FilterParams } from '@/shared/types/common';
import { EQUIPMENT_NOTES } from '@/shared/constants';

/**
 * Equipment Notes Repository
 */
class EquipmentNotesRepository extends BaseRepository<EquipmentNote, CreateEquipmentNoteData, UpdateEquipmentNoteData> {
  protected tableName = EQUIPMENT_NOTES;

  constructor() {
    super(supabase);
  }
}

/**
 * Equipment Notes Service
 * Extends the generic NotesService for equipment-specific functionality
 */
export class EquipmentNotesService extends NotesService<EquipmentNote, EquipmentNoteImage> {
  protected noteTableName = EQUIPMENT_NOTES;
  protected imageTableName = 'equipment_note_images';
  protected foreignKeyField = 'equipment_id';

  constructor(organizationId: string) {
    super(organizationId, new EquipmentNotesRepository());
  }

  /**
   * Get equipment notes with equipment details
   */
  async getEquipmentNotesWithDetails(equipmentId: string): Promise<ApiResponse<Array<EquipmentNote & { equipment_name?: string }>>> {
    return this.executeWithErrorHandling(async () => {
      this.logOperationStart('getEquipmentNotesWithDetails', { equipmentId });
      const startTime = Date.now();

      const { data, error } = await supabase
        .from(this.noteTableName)
        .select(`
          *,
          equipment:equipment_id (
            name
          )
        `)
        .eq('equipment_id', equipmentId)
        .eq('organization_id', this.organizationId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get author names
      const notes = data || [];
      const authorIds = [...new Set(notes.map(note => note.author_id))];
      
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name')
        .in('id', authorIds);

      const authorMap = (profiles || []).reduce((acc, profile) => {
        acc[profile.id] = profile.name;
        return acc;
      }, {} as Record<string, string>);

      const notesWithDetails = notes.map(note => ({
        ...note,
        author_name: authorMap[note.author_id],
        equipment_name: note.equipment?.name
      }));
      
      this.logOperationComplete('getEquipmentNotesWithDetails', Date.now() - startTime, { 
        equipmentId, 
        count: notesWithDetails.length 
      });
      return notesWithDetails;
    }, 'get equipment notes with details');
  }

  /**
   * Get notes by equipment type
   */
  async getNotesByEquipmentType(equipmentType: string, filters?: FilterParams): Promise<ApiResponse<EquipmentNote[]>> {
    return this.executeWithErrorHandling(async () => {
      this.logOperationStart('getNotesByEquipmentType', { equipmentType });
      const startTime = Date.now();

      const { data, error } = await supabase
        .from(this.noteTableName)
        .select(`
          *,
          equipment:equipment_id (
            equipment_type
          )
        `)
        .eq('equipment.equipment_type', equipmentType)
        .eq('organization_id', this.organizationId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const notes = data || [];
      const notesWithAuthors = await this.enrichNotesWithAuthors(notes);
      
      this.logOperationComplete('getNotesByEquipmentType', Date.now() - startTime, { 
        equipmentType, 
        count: notesWithAuthors.length 
      });
      return notesWithAuthors;
    }, 'get notes by equipment type');
  }

  /**
   * Get maintenance-related notes
   */
  async getMaintenanceNotes(equipmentId?: string): Promise<ApiResponse<EquipmentNote[]>> {
    return this.executeWithErrorHandling(async () => {
      this.logOperationStart('getMaintenanceNotes', { equipmentId });
      const startTime = Date.now();

      let query = supabase
        .from(this.noteTableName)
        .select('*')
        .eq('organization_id', this.organizationId)
        .ilike('content', '%maintenance%')
        .order('created_at', { ascending: false });

      if (equipmentId) {
        query = query.eq('equipment_id', equipmentId);
      }

      const { data, error } = await query;

      if (error) throw error;

      const notes = data || [];
      const notesWithAuthors = await this.enrichNotesWithAuthors(notes);
      
      this.logOperationComplete('getMaintenanceNotes', Date.now() - startTime, { 
        equipmentId, 
        count: notesWithAuthors.length 
      });
      return notesWithAuthors;
    }, 'get maintenance notes');
  }

  /**
   * Get notes with high hours worked
   */
  async getHighHoursNotes(minHours: number = 8): Promise<ApiResponse<EquipmentNote[]>> {
    return this.executeWithErrorHandling(async () => {
      this.logOperationStart('getHighHoursNotes', { minHours });
      const startTime = Date.now();

      const { data, error } = await supabase
        .from(this.noteTableName)
        .select('*')
        .eq('organization_id', this.organizationId)
        .gte('hours_worked', minHours)
        .order('hours_worked', { ascending: false });

      if (error) throw error;

      const notes = data || [];
      const notesWithAuthors = await this.enrichNotesWithAuthors(notes);
      
      this.logOperationComplete('getHighHoursNotes', Date.now() - startTime, { 
        minHours, 
        count: notesWithAuthors.length 
      });
      return notesWithAuthors;
    }, 'get high hours notes');
  }

  /**
   * Get notes statistics by equipment
   */
  async getNotesStatsByEquipment(): Promise<ApiResponse<Array<{
    equipment_id: string;
    equipment_name: string;
    total_notes: number;
    total_hours: number;
    last_note_date: string;
  }>>> {
    return this.executeWithErrorHandling(async () => {
      this.logOperationStart('getNotesStatsByEquipment');
      const startTime = Date.now();

      const { data, error } = await supabase
        .from(this.noteTableName)
        .select(`
          equipment_id,
          hours_worked,
          created_at,
          equipment:equipment_id (
            name
          )
        `)
        .eq('organization_id', this.organizationId)
        .order('equipment_id, created_at', { ascending: false });

      if (error) throw error;

      const notes = data || [];
      const statsMap = notes.reduce((acc, note) => {
        const equipmentId = note.equipment_id;
        if (!acc[equipmentId]) {
          acc[equipmentId] = {
            equipment_id: equipmentId,
            equipment_name: note.equipment?.name || 'Unknown',
            total_notes: 0,
            total_hours: 0,
            last_note_date: note.created_at
          };
        }
        acc[equipmentId].total_notes += 1;
        acc[equipmentId].total_hours += note.hours_worked || 0;
        if (note.created_at > acc[equipmentId].last_note_date) {
          acc[equipmentId].last_note_date = note.created_at;
        }
        return acc;
      }, {} as Record<string, any>);

      const stats = Object.values(statsMap);
      
      this.logOperationComplete('getNotesStatsByEquipment', Date.now() - startTime, { 
        count: stats.length 
      });
      return stats;
    }, 'get notes statistics by equipment');
  }

  /**
   * Search notes across all equipment
   */
  async searchNotesGlobally(searchTerm: string): Promise<ApiResponse<Array<EquipmentNote & { equipment_name?: string }>>> {
    return this.executeWithErrorHandling(async () => {
      this.logOperationStart('searchNotesGlobally', { searchTerm });
      const startTime = Date.now();

      const { data, error } = await supabase
        .from(this.noteTableName)
        .select(`
          *,
          equipment:equipment_id (
            name
          )
        `)
        .eq('organization_id', this.organizationId)
        .ilike('content', `%${searchTerm}%`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const notes = data || [];
      const notesWithAuthors = await this.enrichNotesWithAuthors(notes);
      const notesWithEquipment = notesWithAuthors.map(note => ({
        ...note,
        equipment_name: note.equipment?.name
      }));
      
      this.logOperationComplete('searchNotesGlobally', Date.now() - startTime, { 
        searchTerm, 
        count: notesWithEquipment.length 
      });
      return notesWithEquipment;
    }, 'search notes globally');
  }
}

// Export singleton instance factory
export const createEquipmentNotesService = (organizationId: string) => new EquipmentNotesService(organizationId);
