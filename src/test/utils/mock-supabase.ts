import { vi } from 'vitest';

// Mock Supabase client with proper chain structure
// This prevents the real Supabase client from initializing and creating
// open handles (autoRefreshToken timers, WebSocket connections) that would
// prevent the test process from exiting
export const createMockSupabaseClient = () => {
  const createMockChain = () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      gt: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lt: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      like: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      contains: vi.fn().mockReturnThis(),
      containedBy: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      and: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      filter: vi.fn().mockReturnThis(),
      match: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      offset: vi.fn().mockReturnThis(),
      nullsFirst: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      then: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
    
    // Make all chain methods return the same mock object for proper chaining
    Object.keys(chain).forEach(key => {
      if (key !== 'single' && key !== 'maybeSingle' && key !== 'then') {
        (chain as Record<string, ReturnType<typeof vi.fn>>)[key].mockReturnValue(chain);
      }
    });
    
    return chain;
  };

  // Create a mock subscription that can be unsubscribed
  const createMockSubscription = () => ({
    unsubscribe: vi.fn(),
  });

  return {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'test-user' } }, error: null }),
      signInWithPassword: vi.fn().mockResolvedValue({ data: { user: null, session: null }, error: null }),
      signUp: vi.fn().mockResolvedValue({ data: { user: null, session: null }, error: null }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
      signInWithOAuth: vi.fn().mockResolvedValue({ data: { provider: 'google', url: null }, error: null }),
      resetPasswordForEmail: vi.fn().mockResolvedValue({ error: null }),
      updateUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      // Properly mock onAuthStateChange to return a subscription object
      onAuthStateChange: vi.fn().mockImplementation(() => ({
        data: { subscription: createMockSubscription() },
      })),
      mfa: {
        enroll: vi.fn().mockResolvedValue({
          data: { id: 'factor-1', type: 'totp', totp: { qr_code: 'data:image/svg+xml;base64,test', secret: 'TESTSECRET123', uri: 'otpauth://totp/test' } },
          error: null,
        }),
        challenge: vi.fn().mockResolvedValue({
          data: { id: 'challenge-1' },
          error: null,
        }),
        verify: vi.fn().mockResolvedValue({
          data: { access_token: 'token', token_type: 'bearer', expires_in: 3600, refresh_token: 'refresh' },
          error: null,
        }),
        unenroll: vi.fn().mockResolvedValue({ data: { id: 'factor-1' }, error: null }),
        listFactors: vi.fn().mockResolvedValue({
          data: { totp: [], phone: [] },
          error: null,
        }),
        getAuthenticatorAssuranceLevel: vi.fn().mockResolvedValue({
          data: { currentLevel: 'aal1', nextLevel: 'aal1', currentAuthenticationMethods: [] },
          error: null,
        }),
      },
    },
    from: vi.fn(() => createMockChain()),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
      unsubscribe: vi.fn(),
    })),
    removeChannel: vi.fn(),
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn().mockResolvedValue({ data: null, error: null }),
        download: vi.fn().mockResolvedValue({ data: null, error: null }),
        remove: vi.fn().mockResolvedValue({ data: null, error: null }),
        list: vi.fn().mockResolvedValue({ data: [], error: null }),
        getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://example.com/test.png' } }),
      })),
    },
    functions: {
      invoke: vi.fn().mockResolvedValue({ data: null, error: null }),
    },
  };
};

// Mock data
export const mockEquipment = {
  id: '1',
  name: 'Test Equipment',
  manufacturer: 'Test Manufacturer',
  model: 'Test Model',
  serial_number: 'TEST123',
  status: 'active',
  location: 'Test Location',
  organization_id: 'org-1',
  default_pm_template_id: null,
};

export const mockWorkOrder = {
  id: '1',
  title: 'Test Work Order',
  description: 'Test Description',
  equipment_id: '1',
  status: 'submitted',
  priority: 'medium',
  organization_id: 'org-1',
};

export const mockUser = {
  id: '1',
  email: 'test@example.com',
  user_metadata: {
    full_name: 'Test User',
  },
};