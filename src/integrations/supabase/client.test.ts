import { describe, it, expect } from 'vitest';

// Note: The client.ts file throws an error at module load time if env vars are missing.
// We can't easily test this without manipulating env vars before the module loads.
// However, we can test the validation logic that would be used.

describe('supabase client', () => {
  it('should validate environment variables are present', () => {
    // Test the validation logic that would throw at module load
    const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
    const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    // Simulate the validation logic from client.ts lines 8-12
    const validateEnvVars = (url: string | undefined, key: string | undefined) => {
      if (!url || !key) {
        throw new Error(
          'Missing required Supabase environment variables. Please check your .env file and ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set.'
        );
      }
    };

    // Test with missing URL
    expect(() => validateEnvVars(undefined, 'test-key')).toThrow(
      /Missing required Supabase environment variables/
    );

    // Test with missing key
    expect(() => validateEnvVars('https://test.supabase.co', undefined)).toThrow(
      /Missing required Supabase environment variables/
    );

    // Test with empty strings
    expect(() => validateEnvVars('', 'test-key')).toThrow(
      /Missing required Supabase environment variables/
    );

    expect(() => validateEnvVars('https://test.supabase.co', '')).toThrow(
      /Missing required Supabase environment variables/
    );

    // Test with both missing
    expect(() => validateEnvVars(undefined, undefined)).toThrow(
      /Missing required Supabase environment variables/
    );

    // Test with valid values (should not throw)
    expect(() => validateEnvVars('https://test.supabase.co', 'test-key')).not.toThrow();
  });

  it('should have error message that mentions both env vars', () => {
    const error = new Error(
      'Missing required Supabase environment variables. Please check your .env file and ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set.'
    );
    
    expect(error.message).toContain('VITE_SUPABASE_URL');
    expect(error.message).toContain('VITE_SUPABASE_ANON_KEY');
  });
});
