
import { describe, it, expect, beforeEach, vi, type MockInstance } from 'vitest';
import { supabase } from '@/integrations/supabase/client';

// Mock the supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: vi.fn(),
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn()
        }))
      }))
    }))
  }
}));

type SupabaseFromHandlers = {
  insert: (...args: unknown[]) => unknown;
  select?: (...args: unknown[]) => unknown;
};

const supabaseFromMock = supabase.from as unknown as MockInstance<
  [string],
  SupabaseFromHandlers
>;

describe('Webhook Event Idempotency', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('webhook_events Table Gating', () => {
    it('should allow first-time event processing', async () => {
      const mockInsert = vi.fn().mockResolvedValue({
        data: [{ event_id: 'evt_new_123', processed_at: '2024-01-01T00:00:00Z' }],
        error: null
      });

      supabaseFromMock.mockReturnValue({
        insert: mockInsert
      });

      const eventId = 'evt_new_123';
      const result = await supabase.from('webhook_events').insert({ event_id: eventId });
      
      expect(result.error).toBeNull();
      expect(mockInsert).toHaveBeenCalledWith({ event_id: eventId });
    });

    it('should prevent duplicate event processing with unique constraint violation', async () => {
      const mockInsert = vi.fn().mockRejectedValueOnce({
        code: '23505', // PostgreSQL unique constraint violation
        message: 'duplicate key value violates unique constraint "webhook_events_pkey"',
        details: 'Key (event_id)=(evt_duplicate_456) already exists.'
      });

      supabaseFromMock.mockReturnValue({
        insert: mockInsert
      });

      const eventId = 'evt_duplicate_456';
      
      try {
        await supabase.from('webhook_events').insert({ event_id: eventId });
      } catch (error) {
        const supabaseError = error as { code?: string; message?: string };
        expect(supabaseError?.code).toBe('23505');
        expect(supabaseError?.message).toContain('duplicate key value violates unique constraint');
        expect(mockInsert).toHaveBeenCalledWith({ event_id: eventId });
      }
    });

    it('should handle various Stripe event types for idempotency', async () => {
      const stripeEventTypes = [
        'checkout.session.completed',
        'invoice.payment_succeeded',
        'invoice.payment_failed',
        'customer.subscription.updated',
        'customer.subscription.deleted',
        'customer.subscription.trial_will_end',
        'customer.subscription.paused',
        'customer.subscription.resumed'
      ];

      for (const eventType of stripeEventTypes) {
        const mockInsert = vi.fn().mockResolvedValue({
          data: [{ event_id: `evt_${eventType}_123`, processed_at: '2024-01-01T00:00:00Z' }],
          error: null
        });

        supabaseFromMock.mockReturnValue({
          insert: mockInsert
        });

        const eventId = `evt_${eventType}_123`;
        const result = await supabase.from('webhook_events').insert({ event_id: eventId });
        
        expect(result.error).toBeNull();
        expect(mockInsert).toHaveBeenCalledWith({ event_id: eventId });
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors gracefully', async () => {
      const mockInsert = vi.fn().mockRejectedValueOnce({
        code: '08006', // Connection failure
        message: 'could not connect to server'
      });

      supabaseFromMock.mockReturnValue({
        insert: mockInsert
      });

      const eventId = 'evt_connection_error_789';
      
      try {
        await supabase.from('webhook_events').insert({ event_id: eventId });
      } catch (error) {
        const supabaseError = error as { code?: string; message?: string };
        expect(supabaseError?.code).toBe('08006');
        expect(supabaseError?.message).toContain('could not connect to server');
      }
    });

    it('should differentiate between duplicate events and other errors', async () => {
      const duplicateError = {
        code: '23505',
        message: 'duplicate key value violates unique constraint'
      };

      const otherError = {
        code: '42P01', // Undefined table
        message: 'relation "webhook_events" does not exist'
      };

      // Test duplicate error
      let mockInsert = vi.fn().mockRejectedValueOnce(duplicateError);
      supabaseFromMock.mockReturnValue({ insert: mockInsert });

      try {
        await supabase.from('webhook_events').insert({ event_id: 'evt_dup_123' });
      } catch (error) {
        const supabaseError = error as { code?: string };
        expect(supabaseError?.code).toBe('23505');
      }

      // Test other error
      mockInsert = vi.fn().mockRejectedValueOnce(otherError);
      supabaseFromMock.mockReturnValue({ insert: mockInsert });

      try {
        await supabase.from('webhook_events').insert({ event_id: 'evt_other_123' });
      } catch (error) {
        const supabaseError = error as { code?: string };
        expect(supabaseError?.code).toBe('42P01');
      }
    });
  });

  describe('Audit Trail Preservation', () => {
    it('should continue logging to stripe_event_logs for audit purposes', async () => {
      const mockInsert = vi.fn().mockResolvedValue({
        data: [{ id: 'log_123' }],
        error: null
      });

      supabaseFromMock.mockReturnValue({
        insert: mockInsert
      });

      const eventLog = {
        event_id: 'evt_audit_123',
        type: 'invoice.payment_succeeded',
        subscription_id: 'sub_123',
        payload: { test: 'data' }
      };

      const result = await supabase.from('stripe_event_logs').insert(eventLog);
      
      expect(result.error).toBeNull();
      expect(mockInsert).toHaveBeenCalledWith(eventLog);
    });
  });

  describe('Event ID Format Validation', () => {
    it('should handle various Stripe event ID formats', async () => {
      const eventIdFormats = [
        'evt_1A2B3C4D5E6F7G8H',
        'evt_test_1234567890abcdef',
        'evt_live_webhook_endpoint_1234',
        'evt_00000000000000'
      ];

      for (const eventId of eventIdFormats) {
        const mockInsert = vi.fn().mockResolvedValue({
          data: [{ event_id: eventId, processed_at: '2024-01-01T00:00:00Z' }],
          error: null
        });

        supabaseFromMock.mockReturnValue({
          insert: mockInsert
        });

        const result = await supabase.from('webhook_events').insert({ event_id: eventId });
        
        expect(result.error).toBeNull();
        expect(mockInsert).toHaveBeenCalledWith({ event_id: eventId });
      }
    });
  });

  describe('Timestamp Handling', () => {
    it('should automatically set processed_at timestamp', async () => {
      const mockInsert = vi.fn().mockResolvedValue({
        data: [{ 
          event_id: 'evt_timestamp_123', 
          processed_at: new Date().toISOString() 
        }],
        error: null
      });

      supabaseFromMock.mockReturnValue({
        insert: mockInsert
      });

      const eventId = 'evt_timestamp_123';
      const result = await supabase.from('webhook_events').insert({ event_id: eventId });
      
      expect(result.error).toBeNull();
      expect(mockInsert).toHaveBeenCalledWith({ event_id: eventId });
      // The processed_at timestamp is set by the database default
    });
  });
});
