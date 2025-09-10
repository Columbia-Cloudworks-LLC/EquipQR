/**
 * Consolidated Equipment Service
 * Merges multiple equipment services into a unified service
 * Follows SOLID principles with dependency injection and single responsibility
 */

import { BaseService } from '@/shared/base/BaseService';
import { BaseRepository } from '@/shared/base/BaseRepository';
import { supabase } from '@/integrations/supabase/client';
import { 
  Equipment, 
  EnhancedEquipment,
  CreateEquipmentData, 
  UpdateEquipmentData,
  EquipmentFilters,
  EquipmentStats,
  EquipmentSearchResult,
  EquipmentQRData,
  EquipmentWorkingHours,
  MaintenanceRecord,
  MaintenanceType
} from '../types/Equipment';
import { ApiResponse, FilterParams, PaginationParams, QueryOptions } from '@/shared/types/common';
import { EQUIPMENT } from '@/shared/constants';

/**
 * Equipment Repository
 */
class EquipmentRepository extends BaseRepository<Equipment, CreateEquipmentData, UpdateEquipmentData> {
  protected tableName = EQUIPMENT;

  constructor() {
    super(supabase);
  }

  /**
   * Get equipment with enhanced data (team, work orders, notes, etc.)
   */
  async getEnhancedEquipment(filters: FilterParams, pagination?: PaginationParams): Promise<EnhancedEquipment[]> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select(`
        *,
        team:teams!equipment_team_id_fkey (
          id,
          name
        ),
        pm_template:pm_templates!equipment_pm_template_id_fkey (
          id,
          name,
          description
        ),
        work_orders:work_orders!work_orders_equipment_id_fkey (
          id,
          title,
          status,
          priority,
          created_date,
          due_date
        ),
        equipment_notes:equipment_notes!equipment_notes_equipment_id_fkey (
          id,
          content,
          hours_worked,
          created_at
        ),
        equipment_images:equipment_images!equipment_images_equipment_id_fkey (
          id,
          file_name,
          file_url,
          category,
          is_primary
        )
      `)
      .match(filters)
      .order('name', { ascending: true });

    if (error) throw error;

    return (data || []).map(equipment => ({
      ...equipment,
      team_name: equipment.team?.name,
      purchase_price_dollars: equipment.purchase_price_cents ? equipment.purchase_price_cents / 100 : undefined,
      current_value_dollars: equipment.current_value_cents ? equipment.current_value_cents / 100 : undefined,
      is_overdue_maintenance: this.isMaintenanceOverdue(equipment.next_maintenance_date),
      days_since_last_maintenance: this.calculateDaysSinceLastMaintenance(equipment.last_maintenance_date),
      custom_attributes_formatted: this.formatCustomAttributes(equipment.custom_attributes)
    }));
  }

  /**
   * Search equipment with relevance scoring
   */
  async searchEquipment(searchTerm: string, organizationId: string): Promise<EquipmentSearchResult[]> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select(`
        *,
        team:teams!equipment_team_id_fkey (name)
      `)
      .eq('organization_id', organizationId)
      .or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,model.ilike.%${searchTerm}%,serial_number.ilike.%${searchTerm}%,manufacturer.ilike.%${searchTerm}%`)
      .order('name', { ascending: true });

    if (error) throw error;

    return (data || []).map(equipment => {
      const matchedFields: string[] = [];
      let relevanceScore = 0;

      // Calculate relevance score based on field matches
      if (equipment.name.toLowerCase().includes(searchTerm.toLowerCase())) {
        matchedFields.push('name');
        relevanceScore += 10;
      }
      if (equipment.description?.toLowerCase().includes(searchTerm.toLowerCase())) {
        matchedFields.push('description');
        relevanceScore += 5;
      }
      if (equipment.model?.toLowerCase().includes(searchTerm.toLowerCase())) {
        matchedFields.push('model');
        relevanceScore += 8;
      }
      if (equipment.serial_number?.toLowerCase().includes(searchTerm.toLowerCase())) {
        matchedFields.push('serial_number');
        relevanceScore += 7;
      }
      if (equipment.manufacturer?.toLowerCase().includes(searchTerm.toLowerCase())) {
        matchedFields.push('manufacturer');
        relevanceScore += 6;
      }

      return {
        ...equipment,
        team_name: equipment.team?.name,
        relevance_score: relevanceScore,
        matched_fields: matchedFields,
        purchase_price_dollars: equipment.purchase_price_cents ? equipment.purchase_price_cents / 100 : undefined,
        current_value_dollars: equipment.current_value_cents ? equipment.current_value_cents / 100 : undefined
      };
    }).sort((a, b) => (b.relevance_score || 0) - (a.relevance_score || 0));
  }

  /**
   * Get equipment statistics
   */
  async getEquipmentStats(organizationId: string): Promise<EquipmentStats> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('status, equipment_type, team_id, purchase_price_cents, maintenance_interval_days, next_maintenance_date')
      .eq('organization_id', organizationId);

    if (error) throw error;

    const equipment = data || [];
    const today = new Date().toISOString().split('T')[0];

    const stats = equipment.reduce((acc, eq) => {
      acc.total_equipment += 1;
      acc.by_status[eq.status] = (acc.by_status[eq.status] || 0) + 1;
      acc.by_type[eq.equipment_type] = (acc.by_type[eq.equipment_type] || 0) + 1;
      
      if (eq.purchase_price_cents) {
        acc.total_value_cents += eq.purchase_price_cents;
      }
      
      if (eq.maintenance_interval_days) {
        acc.avg_maintenance_interval += eq.maintenance_interval_days;
      }
      
      if (eq.next_maintenance_date && eq.next_maintenance_date < today) {
        acc.maintenance_overdue += 1;
      }
      
      return acc;
    }, {
      total_equipment: 0,
      by_status: {} as Record<string, number>,
      by_type: {} as Record<string, number>,
      by_team: [] as Array<{ team_id: string; team_name: string; count: number }>,
      maintenance_overdue: 0,
      total_value_cents: 0,
      total_value_dollars: 0,
      avg_maintenance_interval: 0,
      equipment_with_work_orders: 0
    });

    // Calculate averages
    stats.total_value_dollars = stats.total_value_cents / 100;
    stats.avg_maintenance_interval = equipment.length > 0 ? stats.avg_maintenance_interval / equipment.length : 0;

    // Get team statistics
    const teamStats = equipment.reduce((acc, eq) => {
      if (eq.team_id) {
        acc[eq.team_id] = (acc[eq.team_id] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    // Get team names
    const teamIds = Object.keys(teamStats);
    if (teamIds.length > 0) {
      const { data: teams } = await this.supabase
        .from('teams')
        .select('id, name')
        .in('id', teamIds);

      stats.by_team = (teams || []).map(team => ({
        team_id: team.id,
        team_name: team.name,
        count: teamStats[team.id] || 0
      }));
    }

    return stats;
  }

  /**
   * Get equipment with overdue maintenance
   */
  async getOverdueMaintenanceEquipment(organizationId: string): Promise<Equipment[]> {
    const today = new Date().toISOString().split('T')[0];
    
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('organization_id', organizationId)
      .lt('next_maintenance_date', today)
      .not('next_maintenance_date', 'is', null)
      .order('next_maintenance_date', { ascending: true });

    if (error) throw error;

    return (data || []).map(equipment => ({
      ...equipment,
      is_overdue_maintenance: true,
      days_since_last_maintenance: this.calculateDaysSinceLastMaintenance(equipment.last_maintenance_date),
      purchase_price_dollars: equipment.purchase_price_cents ? equipment.purchase_price_cents / 100 : undefined,
      current_value_dollars: equipment.current_value_cents ? equipment.current_value_cents / 100 : undefined
    }));
  }

  /**
   * Check if maintenance is overdue
   */
  private isMaintenanceOverdue(nextMaintenanceDate?: string): boolean {
    if (!nextMaintenanceDate) return false;
    const today = new Date().toISOString().split('T')[0];
    return nextMaintenanceDate < today;
  }

  /**
   * Calculate days since last maintenance
   */
  private calculateDaysSinceLastMaintenance(lastMaintenanceDate?: string): number | undefined {
    if (!lastMaintenanceDate) return undefined;
    const today = new Date();
    const lastMaintenance = new Date(lastMaintenanceDate);
    const diffTime = today.getTime() - lastMaintenance.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Format custom attributes for display
   */
  private formatCustomAttributes(customAttributes?: Record<string, any>): Array<{
    key: string;
    value: any;
    label: string;
    type: string;
  }> {
    if (!customAttributes) return [];
    
    return Object.entries(customAttributes).map(([key, value]) => ({
      key,
      value,
      label: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      type: typeof value
    }));
  }
}

/**
 * Equipment Service
 */
export class EquipmentService extends BaseService {
  private repository: EquipmentRepository;

  constructor(organizationId: string) {
    super(organizationId);
    this.repository = new EquipmentRepository();
  }

  /**
   * Get filtered equipment
   */
  async getFilteredEquipment(filters: EquipmentFilters = {}): Promise<ApiResponse<EnhancedEquipment[]>> {
    return this.executeWithErrorHandling(async () => {
      this.logOperationStart('getFilteredEquipment', { filters });
      const startTime = Date.now();

      const queryFilters: FilterParams = {
        ...this.getOrganizationContext()
      };

      // Apply filters
      if (filters.status && filters.status !== 'all') {
        queryFilters.status = filters.status;
      }
      if (filters.teamId) {
        queryFilters.team_id = filters.teamId;
      }
      if (filters.equipmentType) {
        queryFilters.equipment_type = filters.equipmentType;
      }
      if (filters.manufacturer) {
        queryFilters.manufacturer = filters.manufacturer;
      }
      if (filters.location) {
        queryFilters.location = filters.location;
      }
      if (filters.pmTemplateId) {
        queryFilters.pm_template_id = filters.pmTemplateId;
      }

      // Handle date range
      if (filters.dateRange) {
        queryFilters.purchase_date = {
          gte: filters.dateRange.start,
          lte: filters.dateRange.end
        };
      }

      const equipment = await this.repository.getEnhancedEquipment(queryFilters);
      
      // Apply search filter
      let filteredEquipment = equipment;
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        filteredEquipment = equipment.filter(eq => 
          eq.name.toLowerCase().includes(searchTerm) ||
          eq.description?.toLowerCase().includes(searchTerm) ||
          eq.model?.toLowerCase().includes(searchTerm) ||
          eq.serial_number?.toLowerCase().includes(searchTerm) ||
          eq.manufacturer?.toLowerCase().includes(searchTerm) ||
          eq.team_name?.toLowerCase().includes(searchTerm)
        );
      }

      // Apply maintenance overdue filter
      if (filters.hasMaintenanceOverdue) {
        filteredEquipment = filteredEquipment.filter(eq => eq.is_overdue_maintenance);
      }
      
      this.logOperationComplete('getFilteredEquipment', Date.now() - startTime, { 
        filters, 
        count: filteredEquipment.length 
      });
      return filteredEquipment;
    }, 'get filtered equipment');
  }

  /**
   * Search equipment
   */
  async searchEquipment(searchTerm: string): Promise<ApiResponse<EquipmentSearchResult[]>> {
    return this.executeWithErrorHandling(async () => {
      this.logOperationStart('searchEquipment', { searchTerm });
      const startTime = Date.now();

      const results = await this.repository.searchEquipment(searchTerm, this.organizationId);
      
      this.logOperationComplete('searchEquipment', Date.now() - startTime, { 
        searchTerm, 
        count: results.length 
      });
      return results;
    }, 'search equipment');
  }

  /**
   * Get equipment statistics
   */
  async getEquipmentStats(): Promise<ApiResponse<EquipmentStats>> {
    return this.executeWithErrorHandling(async () => {
      this.logOperationStart('getEquipmentStats');
      const startTime = Date.now();

      const stats = await this.repository.getEquipmentStats(this.organizationId);
      
      this.logOperationComplete('getEquipmentStats', Date.now() - startTime);
      return stats;
    }, 'get equipment statistics');
  }

  /**
   * Get equipment with overdue maintenance
   */
  async getOverdueMaintenanceEquipment(): Promise<ApiResponse<Equipment[]>> {
    return this.executeWithErrorHandling(async () => {
      this.logOperationStart('getOverdueMaintenanceEquipment');
      const startTime = Date.now();

      const equipment = await this.repository.getOverdueMaintenanceEquipment(this.organizationId);
      
      this.logOperationComplete('getOverdueMaintenanceEquipment', Date.now() - startTime, { 
        count: equipment.length 
      });
      return equipment;
    }, 'get overdue maintenance equipment');
  }

  /**
   * Create equipment
   */
  async createEquipment(data: CreateEquipmentData): Promise<ApiResponse<Equipment>> {
    return this.executeWithErrorHandling(async () => {
      this.logOperationStart('createEquipment', { name: data.name });
      const startTime = Date.now();

      // Validate required fields
      const requiredFields = ['name', 'equipment_type', 'status'];
      const missingFields = this.validateRequiredFields(data, requiredFields);
      if (missingFields.length > 0) {
        throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
      }

      const equipmentData = {
        ...data,
        ...this.getOrganizationContext()
      };

      const equipment = await this.repository.create(equipmentData);
      
      this.logOperationComplete('createEquipment', Date.now() - startTime, { equipmentId: equipment.id });
      return equipment;
    }, 'create equipment');
  }

  /**
   * Update equipment
   */
  async updateEquipment(equipmentId: string, data: UpdateEquipmentData): Promise<ApiResponse<Equipment>> {
    return this.executeWithErrorHandling(async () => {
      this.logOperationStart('updateEquipment', { equipmentId });
      const startTime = Date.now();

      const equipment = await this.repository.update(equipmentId, data);
      
      this.logOperationComplete('updateEquipment', Date.now() - startTime, { equipmentId });
      return equipment;
    }, 'update equipment');
  }

  /**
   * Delete equipment
   */
  async deleteEquipment(equipmentId: string): Promise<ApiResponse<void>> {
    return this.executeWithErrorHandling(async () => {
      this.logOperationStart('deleteEquipment', { equipmentId });
      const startTime = Date.now();

      await this.repository.delete(equipmentId);
      
      this.logOperationComplete('deleteEquipment', Date.now() - startTime, { equipmentId });
    }, 'delete equipment');
  }

  /**
   * Get equipment by ID with full details
   */
  async getEquipmentById(equipmentId: string): Promise<ApiResponse<EnhancedEquipment | null>> {
    return this.executeWithErrorHandling(async () => {
      this.logOperationStart('getEquipmentById', { equipmentId });
      const startTime = Date.now();

      const equipment = await this.repository.findById(equipmentId);
      if (!equipment) {
        return null;
      }

      // Get enhanced data
      const enhancedEquipment = await this.repository.getEnhancedEquipment({
        id: equipmentId,
        ...this.getOrganizationContext()
      });

      const result = enhancedEquipment[0] || null;
      
      this.logOperationComplete('getEquipmentById', Date.now() - startTime, { equipmentId });
      return result;
    }, 'get equipment by ID');
  }

  /**
   * Update equipment maintenance schedule
   */
  async updateMaintenanceSchedule(
    equipmentId: string, 
    lastMaintenanceDate: string, 
    nextMaintenanceDate: string
  ): Promise<ApiResponse<Equipment>> {
    return this.executeWithErrorHandling(async () => {
      this.logOperationStart('updateMaintenanceSchedule', { equipmentId });
      const startTime = Date.now();

      const equipment = await this.repository.update(equipmentId, {
        last_maintenance_date: lastMaintenanceDate,
        next_maintenance_date: nextMaintenanceDate
      });
      
      this.logOperationComplete('updateMaintenanceSchedule', Date.now() - startTime, { equipmentId });
      return equipment;
    }, 'update maintenance schedule');
  }

  /**
   * Generate QR code for equipment
   */
  async generateQRCode(equipmentId: string): Promise<ApiResponse<EquipmentQRData>> {
    return this.executeWithErrorHandling(async () => {
      this.logOperationStart('generateQRCode', { equipmentId });
      const startTime = Date.now();

      // Generate QR code data
      const qrData = {
        equipment_id: equipmentId,
        organization_id: this.organizationId,
        timestamp: Date.now()
      };

      const qrCodeData = btoa(JSON.stringify(qrData));
      const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrCodeData)}`;

      const result: EquipmentQRData = {
        equipment_id: equipmentId,
        organization_id: this.organizationId,
        qr_code_url: qrCodeUrl,
        qr_code_data: qrCodeData,
        generated_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() // 1 year
      };
      
      this.logOperationComplete('generateQRCode', Date.now() - startTime, { equipmentId });
      return result;
    }, 'generate QR code');
  }
}

// Export singleton instance factory
export const createEquipmentService = (organizationId: string) => new EquipmentService(organizationId);
