import './partAlternatesServiceTestMocks';

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';
import { getAlternatesForPartNumber } from './partAlternatesService';

describe('getAlternatesForPartNumber cancellation behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns empty array when signal is already aborted before RPC call', async () => {
    const abortedSignal = { aborted: true } as AbortSignal;

    const result = await getAlternatesForPartNumber('org-1', 'TEST', abortedSignal);

    expect(result).toEqual([]);
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it('returns empty array when signal is aborted after RPC call', async () => {
    const abortController = new AbortController();
    const { signal } = abortController;

    vi.mocked(supabase.rpc).mockImplementation(async () => {
      queueMicrotask(() => abortController.abort());
      return { data: [], error: null } as { data: unknown; error: null };
    });

    const result = await getAlternatesForPartNumber('org-1', 'TEST', signal);

    expect(result).toEqual([]);
    expect(supabase.rpc).toHaveBeenCalled();
  });

  it('silently handles abort error from RPC error object (lowercase)', async () => {
    const abortController = new AbortController();
    const { signal } = abortController;

    vi.mocked(supabase.rpc).mockResolvedValue({
      data: null,
      error: { message: 'request aborted' },
    });

    const result = await getAlternatesForPartNumber('org-1', 'TEST', signal);

    expect(result).toEqual([]);
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('silently handles abort error from RPC error object (uppercase)', async () => {
    const abortController = new AbortController();
    const { signal } = abortController;

    vi.mocked(supabase.rpc).mockResolvedValue({
      data: null,
      error: { message: 'Request Aborted' },
    });

    const result = await getAlternatesForPartNumber('org-1', 'TEST', signal);

    expect(result).toEqual([]);
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('silently handles cancel error from RPC error object', async () => {
    const abortController = new AbortController();
    const { signal } = abortController;

    vi.mocked(supabase.rpc).mockResolvedValue({
      data: null,
      error: { message: 'request cancelled' },
    });

    const result = await getAlternatesForPartNumber('org-1', 'TEST', signal);

    expect(result).toEqual([]);
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('silently handles AbortError exception', async () => {
    const abortController = new AbortController();
    const { signal } = abortController;
    const abortError = new Error('The operation was aborted');
    abortError.name = 'AbortError';
    vi.mocked(supabase.rpc).mockRejectedValue(abortError);

    const result = await getAlternatesForPartNumber('org-1', 'TEST', signal);

    expect(result).toEqual([]);
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('silently handles plain-object abort when RPC rejects (not returns) with { message }', async () => {
    const abortController = new AbortController();
    const { signal } = abortController;

    vi.mocked(supabase.rpc).mockRejectedValue({ message: 'request aborted' });

    const result = await getAlternatesForPartNumber('org-1', 'TEST', signal);

    expect(result).toEqual([]);
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('silently handles plain-object cancel when RPC rejects with { message }', async () => {
    const abortController = new AbortController();
    const { signal } = abortController;

    vi.mocked(supabase.rpc).mockRejectedValue({ message: 'Operation cancelled by user' });

    const result = await getAlternatesForPartNumber('org-1', 'TEST', signal);

    expect(result).toEqual([]);
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('silently handles exception with abort in message', async () => {
    const abortController = new AbortController();
    const { signal } = abortController;
    const error = new Error('Network request aborted due to timeout');
    vi.mocked(supabase.rpc).mockRejectedValue(error);

    const result = await getAlternatesForPartNumber('org-1', 'TEST', signal);

    expect(result).toEqual([]);
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('silently handles exception with cancel in message', async () => {
    const abortController = new AbortController();
    const { signal } = abortController;
    const error = new Error('Operation cancelled by user');
    vi.mocked(supabase.rpc).mockRejectedValue(error);

    const result = await getAlternatesForPartNumber('org-1', 'TEST', signal);

    expect(result).toEqual([]);
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('does not silently handle non-abort errors', async () => {
    const error = new Error('Database connection failed');
    vi.mocked(supabase.rpc).mockRejectedValue(error);

    await expect(getAlternatesForPartNumber('org-1', 'TEST')).rejects.toThrow('Database connection failed');
    expect(logger.error).toHaveBeenCalledWith('Error looking up alternates for part number:', error);
  });

  it('does not silently handle abort-like errors when no signal is provided', async () => {
    const error = new Error('Transaction aborted due to constraint violation');
    vi.mocked(supabase.rpc).mockRejectedValue(error);

    await expect(getAlternatesForPartNumber('org-1', 'TEST')).rejects.toThrow(
      'Transaction aborted due to constraint violation',
    );
    expect(logger.error).toHaveBeenCalledWith('Error looking up alternates for part number:', error);
  });

  it('does not silently handle cancel-like errors when no signal is provided', async () => {
    const error = new Error('Operation cancelled due to invalid input');
    vi.mocked(supabase.rpc).mockRejectedValue(error);

    await expect(getAlternatesForPartNumber('org-1', 'TEST')).rejects.toThrow(
      'Operation cancelled due to invalid input',
    );
    expect(logger.error).toHaveBeenCalledWith('Error looking up alternates for part number:', error);
  });

  it('does not silently handle RPC error object with abort message when no signal is provided', async () => {
    const error = { message: 'Transaction aborted due to constraint violation' };
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: null,
      error,
    });

    await expect(getAlternatesForPartNumber('org-1', 'TEST')).rejects.toEqual(error);
    expect(logger.error).toHaveBeenCalledWith('Error looking up alternates for part number:', error);
  });

  it('does not silently handle RPC error object with cancel message when no signal is provided', async () => {
    const error = { message: 'Operation cancelled due to invalid input' };
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: null,
      error,
    });

    await expect(getAlternatesForPartNumber('org-1', 'TEST')).rejects.toEqual(error);
    expect(logger.error).toHaveBeenCalledWith('Error looking up alternates for part number:', error);
  });

  it('does not silently handle errors with "signal" in message (not abort/cancel)', async () => {
    const error = new Error('Invalid signal format detected');
    vi.mocked(supabase.rpc).mockRejectedValue(error);

    await expect(getAlternatesForPartNumber('org-1', 'TEST')).rejects.toThrow('Invalid signal format detected');
    expect(logger.error).toHaveBeenCalledWith('Error looking up alternates for part number:', error);
  });

  it('does not silently handle plain-object reject without abort/cancel', async () => {
    const plainError = { message: 'Database connection failed' };
    vi.mocked(supabase.rpc).mockRejectedValue(plainError);

    await expect(getAlternatesForPartNumber('org-1', 'TEST')).rejects.toEqual(plainError);
    expect(logger.error).toHaveBeenCalledWith('Error looking up alternates for part number:', plainError);
  });

  it('handles Error object with undefined message safely', async () => {
    const error = new Error();
    error.message = undefined as unknown as string;
    vi.mocked(supabase.rpc).mockRejectedValue(error);

    await expect(getAlternatesForPartNumber('org-1', 'TEST')).rejects.toBe(error);
    expect(logger.error).toHaveBeenCalledWith('Error looking up alternates for part number:', error);
  });
});
