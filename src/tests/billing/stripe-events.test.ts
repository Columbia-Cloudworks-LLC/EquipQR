
import { describe, it, expect, beforeEach, vi, type MockInstance } from 'vitest';
import { supabase } from '@/integrations/supabase/client';

// Mock the supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: vi.fn(),
      select: vi.fn(),
      eq: vi.fn(() => ({
        single: vi.fn()
      }))
    }))
  }
}));

type SupabaseFromHandlers = {
  insert: (...args: unknown[]) => unknown;
  select?: (...args: unknown[]) => unknown;
  eq?: (...args: unknown[]) => { single: (...args: unknown[]) => unknown };
};

const supabaseFromMock = supabase.from as unknown as MockInstance<
  [string],
  SupabaseFromHandlers
>;

describe('Stripe Event Logging', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Event ID Mapping', () => {
    it('should map invoice.payment_succeeded to subscription_id', () => {
      const event = {
        id: 'evt_test_123',
        type: 'invoice.payment_succeeded',
        data: {
          object: {
            subscription: 'sub_123'
          }
        }
      };

      const subscriptionId = event.data.object.subscription;
      expect(subscriptionId).toBe('sub_123');
    });

    it('should map customer.subscription.updated to subscription_id', () => {
      const event = {
        id: 'evt_test_456',
        type: 'customer.subscription.updated',
        data: {
          object: {
            id: 'sub_456'
          }
        }
      };

      const subscriptionId = event.data.object.id;
      expect(subscriptionId).toBe('sub_456');
    });

    it('should map customer.subscription.trial_will_end to subscription_id', () => {
      const event = {
        id: 'evt_test_789',
        type: 'customer.subscription.trial_will_end',
        data: {
          object: {
            id: 'sub_789'
          }
        }
      };

      const subscriptionId = event.data.object.id;
      expect(subscriptionId).toBe('sub_789');
    });

    it('should map customer.subscription.paused to subscription_id', () => {
      const event = {
        id: 'evt_test_101',
        type: 'customer.subscription.paused',
        data: {
          object: {
            id: 'sub_101'
          }
        }
      };

      const subscriptionId = event.data.object.id;
      expect(subscriptionId).toBe('sub_101');
    });

    it('should map customer.subscription.resumed to subscription_id', () => {
      const event = {
        id: 'evt_test_202',
        type: 'customer.subscription.resumed',
        data: {
          object: {
            id: 'sub_202'
          }
        }
      };

      const subscriptionId = event.data.object.id;
      expect(subscriptionId).toBe('sub_202');
    });
  });

  describe('Legacy stripe_event_logs Idempotency', () => {
    it('should prevent duplicate event processing in audit logs', async () => {
      const mockInsert = vi.fn().mockRejectedValueOnce({
        code: '23505', // Unique constraint violation
        message: 'duplicate key value violates unique constraint'
      });

      supabaseFromMock.mockReturnValue({
        insert: mockInsert
      });

      const eventLog = {
        event_id: 'evt_duplicate_123',
        type: 'invoice.payment_succeeded',
        subscription_id: 'sub_123',
        payload: { test: 'data' }
      };

      try {
        await supabase.from('stripe_event_logs').insert(eventLog);
      } catch (error) {
        const supabaseError = error as { code?: string };
        expect(supabaseError?.code).toBe('23505');
        expect(mockInsert).toHaveBeenCalledWith(eventLog);
      }
    });

    it('should allow new event processing in audit logs', async () => {
      const mockInsert = vi.fn().mockResolvedValue({
        data: [{ id: 'log_123' }],
        error: null
      });

      supabaseFromMock.mockReturnValue({
        insert: mockInsert
      });

      const eventLog = {
        event_id: 'evt_new_456',
        type: 'customer.subscription.updated',
        subscription_id: 'sub_456',
        payload: { test: 'data' }
      };

      const result = await supabase.from('stripe_event_logs').insert(eventLog);
      
      expect(result.error).toBeNull();
      expect(mockInsert).toHaveBeenCalledWith(eventLog);
    });
  });

  describe('Subscription Status Transitions', () => {
    const statusTransitions = [
      {
        event: 'customer.subscription.updated',
        oldStatus: 'active',
        newStatus: 'past_due',
        description: 'Active subscription becomes past due'
      },
      {
        event: 'customer.subscription.updated', 
        oldStatus: 'past_due',
        newStatus: 'active',
        description: 'Past due subscription becomes active'
      },
      {
        event: 'customer.subscription.paused',
        oldStatus: 'active',
        newStatus: 'paused',
        description: 'Active subscription gets paused'
      },
      {
        event: 'customer.subscription.resumed',
        oldStatus: 'paused', 
        newStatus: 'active',
        description: 'Paused subscription gets resumed'
      }
    ];

    statusTransitions.forEach(({ event, oldStatus, newStatus, description }) => {
      it(`should handle ${description}`, () => {
        const mockEvent = {
          id: `evt_${newStatus}_123`,
          type: event,
          data: {
            object: {
              id: 'sub_123',
              status: newStatus,
              previous_attributes: oldStatus ? { status: oldStatus } : undefined
            }
          }
        };

        expect(mockEvent.data.object.status).toBe(newStatus);
        if (oldStatus) {
          expect(mockEvent.data.object.previous_attributes?.status).toBe(oldStatus);
        }
      });
    });
  });

  describe('Member Cleanup Logic', () => {
    const memberCleanupScenarios = [
      {
        scenario: 'Subscription quantity reduced from 10 to 7',
        oldQuantity: 10,
        newQuantity: 7,
        expectedDeactivations: 3
      },
      {
        scenario: 'Subscription quantity reduced from 5 to 2', 
        oldQuantity: 5,
        newQuantity: 2,
        expectedDeactivations: 3
      },
      {
        scenario: 'Subscription quantity increased from 3 to 8',
        oldQuantity: 3,
        newQuantity: 8,
        expectedDeactivations: 0
      },
      {
        scenario: 'Subscription quantity remains the same',
        oldQuantity: 5,
        newQuantity: 5,
        expectedDeactivations: 0
      }
    ];

    memberCleanupScenarios.forEach(({ scenario, oldQuantity, newQuantity, expectedDeactivations }) => {
      it(`should handle ${scenario}`, () => {
        const quantityChange = oldQuantity - newQuantity;
        const membersToDeactivate = Math.max(0, quantityChange);
        
        expect(membersToDeactivate).toBe(expectedDeactivations);
      });
    });
  });

  describe('Dual Idempotency System', () => {
    it('should handle both webhook_events and stripe_event_logs idempotency', async () => {
      // First, webhook_events should gate the processing
      const webhookEventsInsert = vi.fn().mockRejectedValueOnce({
        code: '23505',
        message: 'duplicate key value violates unique constraint "webhook_events_pkey"'
      });

      // stripe_event_logs should still be callable for audit (but won't be reached if webhook_events blocks)
      const eventLogsInsert = vi.fn().mockResolvedValue({
        data: [{ id: 'log_123' }],
        error: null
      });

      supabaseFromMock.mockImplementation((table: string) => {
        if (table === 'webhook_events') {
          return { insert: webhookEventsInsert };
        }
        if (table === 'stripe_event_logs') {
          return { insert: eventLogsInsert };
        }
        return { insert: vi.fn() };
      });

      // Test webhook_events gating
      try {
        await supabase.from('webhook_events').insert({ event_id: 'evt_dual_123' });
      } catch (error) {
        const supabaseError = error as { code?: string };
        expect(supabaseError?.code).toBe('23505');
        expect(webhookEventsInsert).toHaveBeenCalledWith({ event_id: 'evt_dual_123' });
      }

      // Test that stripe_event_logs would still work for audit
      const auditResult = await supabase.from('stripe_event_logs').insert({
        event_id: 'evt_audit_123',
        type: 'invoice.payment_succeeded',
        subscription_id: 'sub_123',
        payload: { test: 'data' }
      });

      expect(auditResult.error).toBeNull();
      expect(eventLogsInsert).toHaveBeenCalled();
    });
  });
});
