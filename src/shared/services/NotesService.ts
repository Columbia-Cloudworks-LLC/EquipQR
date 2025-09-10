/**
 * Generic Notes Service pattern
 * Provides common functionality for all note-like entities (work orders, equipment, etc.)
 * Follows SOLID principles with dependency inversion
 */

import { BaseService } from '../base/BaseService';
import { BaseRepository } from '../base/BaseRepository';
import { BaseNote, BaseImage, ApiResponse, FilterParams, PaginationParams } from '../types/common';
import { supabase } from '@/integrations/supabase/client';

export interface CreateNoteData {
  content: string;
  is_private: boolean;
  hours_worked: number;
  author_id: string;
}

export interface UpdateNoteData {
  content?: string;
  is_private?: boolean;
  hours_worked?: number;
}

export interface NoteImageData {
  file_name: string;
  file_url: string;
  file_size?: number;
  mime_type?: string;
  description?: string;
  uploaded_by: string;
}

export abstract class NotesService<TNote extends BaseNote, TNoteImage extends BaseImage> extends BaseService {
  protected repository: BaseRepository<TNote, CreateNoteData, UpdateNoteData>;
  protected abstract noteTableName: string;
  protected abstract imageTableName: string;
  protected abstract foreignKeyField: string;

  constructor(organizationId: string, repository: BaseRepository<TNote, CreateNoteData, UpdateNoteData>) {
    super(organizationId);
    this.repository = repository;
  }

  /**
   * Get notes for a specific entity
   */
  async getNotes(entityId: string, filters?: FilterParams): Promise<ApiResponse<TNote[]>> {
    return this.executeWithErrorHandling(async () => {
      const queryFilters = {
        ...filters,
        [this.foreignKeyField]: entityId,
        ...this.getOrganizationContext()
      };

      const notes = await this.repository.findMany(queryFilters);
      
      // Get author names for each note
      const notesWithAuthors = await this.enrichNotesWithAuthors(notes);
      
      return notesWithAuthors;
    }, `get notes for ${this.noteTableName}`);
  }

  /**
   * Get a specific note by ID
   */
  async getNoteById(noteId: string): Promise<ApiResponse<TNote | null>> {
    return this.executeWithErrorHandling(async () => {
      const note = await this.repository.findById(noteId);
      if (!note) return null;
      
      // Get author name
      const notesWithAuthors = await this.enrichNotesWithAuthors([note]);
      return notesWithAuthors[0] || null;
    }, `get note ${noteId}`);
  }

  /**
   * Create a new note
   */
  async createNote(entityId: string, data: CreateNoteData): Promise<ApiResponse<TNote>> {
    return this.executeWithErrorHandling(async () => {
      const noteData = {
        ...data,
        [this.foreignKeyField]: entityId,
        ...this.getOrganizationContext()
      };

      const note = await this.repository.create(noteData);
      
      // Get author name
      const notesWithAuthors = await this.enrichNotesWithAuthors([note]);
      return notesWithAuthors[0];
    }, `create note for ${this.noteTableName}`);
  }

  /**
   * Update an existing note
   */
  async updateNote(noteId: string, data: UpdateNoteData): Promise<ApiResponse<TNote>> {
    return this.executeWithErrorHandling(async () => {
      const note = await this.repository.update(noteId, data);
      
      // Get author name
      const notesWithAuthors = await this.enrichNotesWithAuthors([note]);
      return notesWithAuthors[0];
    }, `update note ${noteId}`);
  }

  /**
   * Delete a note
   */
  async deleteNote(noteId: string): Promise<ApiResponse<void>> {
    return this.executeWithErrorHandling(async () => {
      // First delete associated images
      await this.deleteNoteImages(noteId);
      
      // Then delete the note
      await this.repository.delete(noteId);
    }, `delete note ${noteId}`);
  }

  /**
   * Get images for a note
   */
  async getNoteImages(noteId: string): Promise<ApiResponse<TNoteImage[]>> {
    return this.executeWithErrorHandling(async () => {
      const { data, error } = await supabase
        .from(this.imageTableName)
        .select('*')
        .eq('note_id', noteId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get uploader names
      const imagesWithUploaders = await this.enrichImagesWithUploaders(data || []);
      return imagesWithUploaders;
    }, `get images for note ${noteId}`);
  }

  /**
   * Add image to a note
   */
  async addNoteImage(noteId: string, imageData: NoteImageData): Promise<ApiResponse<TNoteImage>> {
    return this.executeWithErrorHandling(async () => {
      const { data, error } = await supabase
        .from(this.imageTableName)
        .insert({
          ...imageData,
          note_id: noteId,
          ...this.getOrganizationContext()
        })
        .select()
        .single();

      if (error) throw error;

      // Get uploader name
      const imagesWithUploaders = await this.enrichImagesWithUploaders([data]);
      return imagesWithUploaders[0];
    }, `add image to note ${noteId}`);
  }

  /**
   * Delete an image from a note
   */
  async deleteNoteImage(imageId: string): Promise<ApiResponse<void>> {
    return this.executeWithErrorHandling(async () => {
      const { error } = await supabase
        .from(this.imageTableName)
        .delete()
        .eq('id', imageId);

      if (error) throw error;
    }, `delete image ${imageId}`);
  }

  /**
   * Delete all images for a note
   */
  async deleteNoteImages(noteId: string): Promise<ApiResponse<void>> {
    return this.executeWithErrorHandling(async () => {
      const { error } = await supabase
        .from(this.imageTableName)
        .delete()
        .eq('note_id', noteId);

      if (error) throw error;
    }, `delete images for note ${noteId}`);
  }

  /**
   * Get notes by author
   */
  async getNotesByAuthor(authorId: string, filters?: FilterParams): Promise<ApiResponse<TNote[]>> {
    return this.executeWithErrorHandling(async () => {
      const queryFilters = {
        ...filters,
        author_id: authorId,
        ...this.getOrganizationContext()
      };

      const notes = await this.repository.findMany(queryFilters);
      const notesWithAuthors = await this.enrichNotesWithAuthors(notes);
      return notesWithAuthors;
    }, `get notes by author ${authorId}`);
  }

  /**
   * Search notes by content
   */
  async searchNotes(query: string, entityId?: string): Promise<ApiResponse<TNote[]>> {
    return this.executeWithErrorHandling(async () => {
      let supabaseQuery = supabase
        .from(this.noteTableName)
        .select('*')
        .ilike('content', `%${query}%`)
        .eq('organization_id', this.organizationId);

      if (entityId) {
        supabaseQuery = supabaseQuery.eq(this.foreignKeyField, entityId);
      }

      const { data, error } = await supabaseQuery;

      if (error) throw error;

      const notesWithAuthors = await this.enrichNotesWithAuthors(data || []);
      return notesWithAuthors;
    }, `search notes with query "${query}"`);
  }

  /**
   * Get note statistics
   */
  async getNoteStats(entityId?: string): Promise<ApiResponse<{
    totalNotes: number;
    totalHours: number;
    privateNotes: number;
    publicNotes: number;
  }>> {
    return this.executeWithErrorHandling(async () => {
      let query = supabase
        .from(this.noteTableName)
        .select('is_private, hours_worked')
        .eq('organization_id', this.organizationId);

      if (entityId) {
        query = query.eq(this.foreignKeyField, entityId);
      }

      const { data, error } = await query;

      if (error) throw error;

      const stats = (data || []).reduce((acc, note) => {
        acc.totalNotes += 1;
        acc.totalHours += note.hours_worked || 0;
        if (note.is_private) {
          acc.privateNotes += 1;
        } else {
          acc.publicNotes += 1;
        }
        return acc;
      }, {
        totalNotes: 0,
        totalHours: 0,
        privateNotes: 0,
        publicNotes: 0
      });

      return stats;
    }, `get note statistics`);
  }

  /**
   * Enrich notes with author names
   */
  private async enrichNotesWithAuthors(notes: TNote[]): Promise<TNote[]> {
    if (notes.length === 0) return notes;

    const authorIds = [...new Set(notes.map(note => note.author_id))];
    
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, name')
      .in('id', authorIds);

    const authorMap = (profiles || []).reduce((acc, profile) => {
      acc[profile.id] = profile.name;
      return acc;
    }, {} as Record<string, string>);

    return notes.map(note => ({
      ...note,
      author_name: authorMap[note.author_id]
    }));
  }

  /**
   * Enrich images with uploader names
   */
  private async enrichImagesWithUploaders(images: TNoteImage[]): Promise<TNoteImage[]> {
    if (images.length === 0) return images;

    const uploaderIds = [...new Set(images.map(image => image.uploaded_by))];
    
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, name')
      .in('id', uploaderIds);

    const uploaderMap = (profiles || []).reduce((acc, profile) => {
      acc[profile.id] = profile.name;
      return acc;
    }, {} as Record<string, string>);

    return images.map(image => ({
      ...image,
      uploaded_by_name: uploaderMap[image.uploaded_by]
    }));
  }
}
