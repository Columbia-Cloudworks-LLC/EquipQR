/**
 * Base Repository class implementing the Repository pattern
 * Provides generic CRUD operations with Supabase integration
 * Follows SOLID principles with dependency inversion
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { 
  BaseEntity, 
  CrudOperations, 
  FilterParams, 
  PaginationParams, 
  QueryOptions,
  PaginatedResult 
} from '../types/common';
import { logger } from '../../utils/logger';

export abstract class BaseRepository<TEntity extends BaseEntity, TCreateData, TUpdateData> 
  implements CrudOperations<TEntity, TCreateData, TUpdateData> {
  
  protected supabase: SupabaseClient;
  protected abstract tableName: string;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  /**
   * Find entity by ID
   */
  async findById(id: string): Promise<TEntity | null> {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned
          return null;
        }
        throw error;
      }

      return data as TEntity;
    } catch (error) {
      logger.error(`Error finding ${this.tableName} by ID ${id}:`, error);
      throw error;
    }
  }

  /**
   * Find multiple entities with optional filtering and pagination
   */
  async findMany(filters?: FilterParams, pagination?: PaginationParams): Promise<TEntity[]> {
    try {
      let query = this.supabase
        .from(this.tableName)
        .select('*');

      // Apply filters
      if (filters) {
        query = this.applyFilters(query, filters);
      }

      // Apply pagination
      if (pagination) {
        const { page = 1, limit = 20, sortBy, sortOrder = 'asc' } = pagination;
        const offset = (page - 1) * limit;
        
        query = query.range(offset, offset + limit - 1);
        
        if (sortBy) {
          query = query.order(sortBy, { ascending: sortOrder === 'asc' });
        }
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data || []) as TEntity[];
    } catch (error) {
      logger.error(`Error finding ${this.tableName} entities:`, error);
      throw error;
    }
  }

  /**
   * Find entities with advanced query options
   */
  async findWithOptions(options: QueryOptions): Promise<PaginatedResult<TEntity>> {
    try {
      const { filters, pagination, includes, orderBy } = options;
      const { page = 1, limit = 20 } = pagination || {};
      const offset = (page - 1) * limit;

      let query = this.supabase
        .from(this.tableName)
        .select(includes ? includes.join(',') : '*');

      // Apply filters
      if (filters) {
        query = this.applyFilters(query, filters);
      }

      // Apply ordering
      if (orderBy && orderBy.length > 0) {
        orderBy.forEach((order, index) => {
          query = query.order(order.field, { 
            ascending: order.direction === 'asc',
            nullsFirst: index === 0 // Only nullsFirst for primary sort
          });
        });
      }

      // Get total count for pagination
      const { count } = await this.supabase
        .from(this.tableName)
        .select('*', { count: 'exact', head: true });

      // Apply pagination
      query = query.range(offset, offset + limit - 1);

      const { data, error } = await query;

      if (error) throw error;

      const total = count || 0;
      const totalPages = Math.ceil(total / limit);

      return {
        data: (data || []) as TEntity[],
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrevious: page > 1,
        },
      };
    } catch (error) {
      logger.error(`Error finding ${this.tableName} with options:`, error);
      throw error;
    }
  }

  /**
   * Create new entity
   */
  async create(data: TCreateData): Promise<TEntity> {
    try {
      const { data: result, error } = await this.supabase
        .from(this.tableName)
        .insert(data)
        .select()
        .single();

      if (error) throw error;

      return result as TEntity;
    } catch (error) {
      logger.error(`Error creating ${this.tableName}:`, error);
      throw error;
    }
  }

  /**
   * Update existing entity
   */
  async update(id: string, data: TUpdateData): Promise<TEntity> {
    try {
      const { data: result, error } = await this.supabase
        .from(this.tableName)
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      return result as TEntity;
    } catch (error) {
      logger.error(`Error updating ${this.tableName} ${id}:`, error);
      throw error;
    }
  }

  /**
   * Delete entity by ID
   */
  async delete(id: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from(this.tableName)
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      logger.error(`Error deleting ${this.tableName} ${id}:`, error);
      throw error;
    }
  }

  /**
   * Soft delete entity (if supported by table)
   */
  async softDelete(id: string): Promise<TEntity> {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .update({ 
          deleted_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      return data as TEntity;
    } catch (error) {
      logger.error(`Error soft deleting ${this.tableName} ${id}:`, error);
      throw error;
    }
  }

  /**
   * Count entities with optional filters
   */
  async count(filters?: FilterParams): Promise<number> {
    try {
      let query = this.supabase
        .from(this.tableName)
        .select('*', { count: 'exact', head: true });

      if (filters) {
        query = this.applyFilters(query, filters);
      }

      const { count, error } = await query;

      if (error) throw error;

      return count || 0;
    } catch (error) {
      logger.error(`Error counting ${this.tableName}:`, error);
      throw error;
    }
  }

  /**
   * Check if entity exists
   */
  async exists(id: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('id')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return false;
        }
        throw error;
      }

      return !!data;
    } catch (error) {
      logger.error(`Error checking existence of ${this.tableName} ${id}:`, error);
      throw error;
    }
  }

  /**
   * Apply filters to query
   * Override this method in subclasses for custom filter logic
   */
  protected applyFilters(query: any, filters: FilterParams): any {
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        if (Array.isArray(value)) {
          query = query.in(key, value);
        } else if (typeof value === 'string' && value.includes('*')) {
          // Wildcard search
          const searchValue = value.replace(/\*/g, '%');
          query = query.ilike(key, searchValue);
        } else if (typeof value === 'object' && value !== null) {
          // Handle range queries like { gte: 10, lte: 20 }
          Object.entries(value as Record<string, any>).forEach(([operator, val]) => {
            switch (operator) {
              case 'gte':
                query = query.gte(key, val);
                break;
              case 'lte':
                query = query.lte(key, val);
                break;
              case 'gt':
                query = query.gt(key, val);
                break;
              case 'lt':
                query = query.lt(key, val);
                break;
              case 'like':
                query = query.like(key, val);
                break;
              case 'ilike':
                query = query.ilike(key, val);
                break;
            }
          });
        } else {
          query = query.eq(key, value);
        }
      }
    });

    return query;
  }

  /**
   * Get the table name for this repository
   */
  getTableName(): string {
    return this.tableName;
  }
}
