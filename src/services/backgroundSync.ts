import { supabase } from '@/integrations/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { cacheManager } from './cacheManager';
import { performanceMonitor } from '@/utils/performanceMonitoring';
import { logger } from '@/utils/logger';

// PHASE 3: Background sync service for real-time updates
export class BackgroundSyncService {
  private static instance: BackgroundSyncService;
  private subscriptions: Map<string, RealtimeChannel | NodeJS.Timeout> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private isOnline = navigator.onLine;
  private syncQueue: Array<{ type: string; data: unknown; timestamp: number }> = [];

  private constructor() {
    this.setupNetworkListeners();
  }

  static getInstance(): BackgroundSyncService {
    if (!BackgroundSyncService.instance) {
      BackgroundSyncService.instance = new BackgroundSyncService();
    }
    return BackgroundSyncService.instance;
  }

  private setupNetworkListeners() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.processSyncQueue();
      this.reconnectSubscriptions();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }

  // Subscribe to real-time updates for an organization
  subscribeToOrganization(organizationId: string) {
    if (this.subscriptions.has(organizationId)) {
      return; // Already subscribed
    }

    const timer = performanceMonitor.startTimer('realtime-subscription');

    const channel = supabase
      .channel(`organization-${organizationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'equipment',
          filter: `organization_id=eq.${organizationId}`
        },
        (payload) => this.handleEquipmentChange(organizationId, payload)
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'work_orders',
          filter: `organization_id=eq.${organizationId}`
        },
        (payload) => this.handleWorkOrderChange(organizationId, payload)
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'teams',
          filter: `organization_id=eq.${organizationId}`
        },
        (payload) => this.handleTeamChange(organizationId, payload)
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'equipment_notes',
        },
        (payload) => this.handleNoteChange(organizationId, payload)
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'organization_members',
          filter: `organization_id=eq.${organizationId}`
        },
        (payload) => this.handleOrganizationMemberChange(organizationId, payload)
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'organization_invitations',
          filter: `organization_id=eq.${organizationId}`
        },
        (payload) => this.handleOrganizationInvitationChange(organizationId, payload)
      )
      .subscribe((status) => {
        timer();
        logger.debug(`Real-time subscription status for org ${organizationId}: ${status}`);
        
        if (status === 'SUBSCRIBED') {
          this.reconnectAttempts = 0;
        } else if (status === 'CHANNEL_ERROR') {
          this.handleReconnection(organizationId);
        }
      });

    this.subscriptions.set(organizationId, channel);
  }

  // Unsubscribe from organization updates
  unsubscribeFromOrganization(organizationId: string) {
    const channel = this.subscriptions.get(organizationId);
    if (channel && !organizationId.startsWith('periodic-')) {
      supabase.removeChannel(channel as RealtimeChannel);
      this.subscriptions.delete(organizationId);
    }
  }

  private handleEquipmentChange(organizationId: string, payload: Record<string, unknown>) {
    logger.debug('Equipment change detected', payload);
    
    const payloadNew = payload.new as Record<string, unknown> | null;
    const payloadOld = payload.old as Record<string, unknown> | null;
    const equipmentId = payloadNew?.id || payloadOld?.id;
    
    if (payload.eventType === 'DELETE') {
      cacheManager.invalidateOrganizationData(organizationId);
    } else {
      cacheManager.invalidateEquipmentRelated(organizationId, equipmentId as string);
    }

    // Queue for offline sync if needed
    if (!this.isOnline) {
      this.queueForSync('equipment', payload);
    }
  }

  private handleWorkOrderChange(organizationId: string, payload: Record<string, unknown>) {
    logger.debug('Work order change detected', payload);
    
    const payloadNew = payload.new as Record<string, unknown> | null;
    const payloadOld = payload.old as Record<string, unknown> | null;
    const workOrderId = payloadNew?.id || payloadOld?.id;
    const equipmentId = payloadNew?.equipment_id || payloadOld?.equipment_id;
    
    cacheManager.invalidateWorkOrderRelated(organizationId, workOrderId as string, equipmentId as string);

    if (!this.isOnline) {
      this.queueForSync('work_order', payload);
    }
  }

  private handleTeamChange(organizationId: string, payload: Record<string, unknown>) {
    logger.debug('Team change detected', payload);
    
    const payloadNew = payload.new as Record<string, unknown> | null;
    const payloadOld = payload.old as Record<string, unknown> | null;
    const teamId = payloadNew?.id || payloadOld?.id;
    cacheManager.invalidateTeamRelated(organizationId, teamId as string);

    if (!this.isOnline) {
      this.queueForSync('team', payload);
    }
  }

  private handleNoteChange(organizationId: string, payload: Record<string, unknown>) {
    logger.debug('Note change detected', payload);
    
    const payloadNew = payload.new as Record<string, unknown> | null;
    const payloadOld = payload.old as Record<string, unknown> | null;
    const equipmentId = payloadNew?.equipment_id || payloadOld?.equipment_id;
    if (equipmentId) {
      cacheManager.invalidateEquipmentRelated(organizationId, equipmentId as string);
    }

    if (!this.isOnline) {
      this.queueForSync('note', payload);
    }
  }

  private handleOrganizationMemberChange(organizationId: string, payload: Record<string, unknown>) {
    logger.debug('Organization member change detected', payload);
    
    cacheManager.invalidateOrganizationMemberRelated(organizationId);

    if (!this.isOnline) {
      this.queueForSync('organization_member', payload);
    }
  }

  private handleOrganizationInvitationChange(organizationId: string, payload: Record<string, unknown>) {
    logger.debug('Organization invitation change detected', payload);
    
    cacheManager.invalidateOrganizationInvitationRelated(organizationId);

    if (!this.isOnline) {
      this.queueForSync('organization_invitation', payload);
    }
  }

  private handleReconnection(organizationId: string) {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      logger.error(`Max reconnection attempts reached for org ${organizationId}`);
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.pow(2, this.reconnectAttempts) * 1000; // Exponential backoff

    setTimeout(() => {
      logger.info(`Attempting to reconnect to org ${organizationId} (attempt ${this.reconnectAttempts})`);
      this.unsubscribeFromOrganization(organizationId);
      this.subscribeToOrganization(organizationId);
    }, delay);
  }

  private queueForSync(type: string, data: unknown) {
    this.syncQueue.push({
      type,
      data,
      timestamp: Date.now()
    });

    // Limit queue size
    if (this.syncQueue.length > 100) {
      this.syncQueue = this.syncQueue.slice(-50); // Keep last 50 items
    }
  }

  private async processSyncQueue() {
    if (!this.isOnline || this.syncQueue.length === 0) {
      return;
    }

    logger.debug(`Processing ${this.syncQueue.length} queued sync items`);
    
    // Process items in batches
    const batchSize = 10;
    while (this.syncQueue.length > 0) {
      const batch = this.syncQueue.splice(0, batchSize);
      
      try {
        await Promise.all(batch.map(item => this.processSyncItem(item)));
      } catch (error) {
        logger.error('Error processing sync batch:', error);
        // Re-queue failed items
        this.syncQueue.unshift(...batch);
        break;
      }
    }
  }

  private async processSyncItem(item: { type: string; data: unknown; timestamp: number }) {
    // Process the queued sync item
    // This could involve re-fetching data, showing notifications, etc.
    logger.debug('Processing sync item:', item);
    
    // For now, just invalidate relevant caches
    // In a real implementation, you might want to show notifications
    // or update specific UI elements
  }

  private reconnectSubscriptions() {
    logger.info('Reconnecting all subscriptions after coming online');
    
    for (const [organizationId] of this.subscriptions) {
      this.unsubscribeFromOrganization(organizationId);
      this.subscribeToOrganization(organizationId);
    }
  }

  // Background periodic sync for critical data
  startPeriodicSync(organizationId: string, intervalMs = 5 * 60 * 1000) { // 5 minutes default
    const intervalId = setInterval(async () => {
      try {
        // Sync critical data that might have been missed
        await this.syncCriticalData(organizationId);
      } catch (error) {
        logger.error('Periodic sync error:', error);
      }
    }, intervalMs);

    // Store interval ID for cleanup
    this.subscriptions.set(`periodic-${organizationId}`, intervalId);
  }

  private async syncCriticalData(organizationId: string) {
    if (!this.isOnline) return;

    const timer = performanceMonitor.startTimer('periodic-sync');
    
    try {
      // Refresh critical queries that might be stale
      cacheManager.invalidateOrganizationData(organizationId);
      
      // Log sync completion
      performanceMonitor.recordMetric('periodic-sync-success', 1);
    } catch (error) {
      performanceMonitor.recordMetric('periodic-sync-error', 1);
      throw error;
    } finally {
      timer();
    }
  }

  // Cleanup all subscriptions
  cleanup() {
    for (const [key, subscription] of this.subscriptions) {
      if (key.startsWith('periodic-')) {
        clearInterval(subscription as NodeJS.Timeout);
      } else {
        supabase.removeChannel(subscription as RealtimeChannel);
      }
    }
    this.subscriptions.clear();
  }

  // Get sync status
  getSyncStatus() {
    return {
      isOnline: this.isOnline,
      activeSubscriptions: this.subscriptions.size,
      queuedItems: this.syncQueue.length,
      reconnectAttempts: this.reconnectAttempts
    };
  }
}

// Export singleton instance
export const backgroundSync = BackgroundSyncService.getInstance();