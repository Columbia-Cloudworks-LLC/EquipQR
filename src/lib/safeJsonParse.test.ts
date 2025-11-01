import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { safeJsonParse } from './safeJsonParse';

describe('safeJsonParse', () => {
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
  });

  it('should parse valid JSON successfully', () => {
    const result = safeJsonParse('{"test": "value"}', {});
    expect(result).toEqual({ test: 'value' });
    expect(consoleWarnSpy).not.toHaveBeenCalled();
  });

  it('should return fallback for invalid JSON and log warning', () => {
    const fallback = { default: true };
    const result = safeJsonParse('invalid json', fallback);
    
    expect(result).toEqual(fallback);
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      '⚠️ Failed to parse JSON', 
      expect.any(SyntaxError)
    );
  });

  it('should return fallback for invalid JSON silently when silent=true', () => {
    const fallback = { default: true };
    const result = safeJsonParse('invalid json', fallback, { silent: true });
    
    expect(result).toEqual(fallback);
    expect(consoleWarnSpy).not.toHaveBeenCalled();
  });

  it('should include context in warning message', () => {
    const fallback = [];
    safeJsonParse('invalid json', fallback, { context: 'template: test-123' });
    
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      '⚠️ Failed to parse JSON for template: test-123', 
      expect.any(SyntaxError)
    );
  });

  it('should handle arrays correctly', () => {
    const result = safeJsonParse('[1, 2, 3]', []);
    expect(result).toEqual([1, 2, 3]);
  });

  it('should handle complex objects', () => {
    const complexObject = {
      id: 'test',
      data: [{ name: 'item1' }, { name: 'item2' }],
      nested: { deep: { value: 42 } }
    };
    
    const result = safeJsonParse(JSON.stringify(complexObject), {});
    expect(result).toEqual(complexObject);
  });
});