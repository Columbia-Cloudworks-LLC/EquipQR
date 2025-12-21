import { describe, it, expect } from 'vitest';
import { deepDiff, formatDiffValue, getDiffSummary, type JsonDiff } from '../jsonDiff';

describe('jsonDiff', () => {
  describe('deepDiff', () => {
    it('should return empty array for identical primitives', () => {
      expect(deepDiff(1, 1)).toEqual([]);
      expect(deepDiff('hello', 'hello')).toEqual([]);
      expect(deepDiff(true, true)).toEqual([]);
      expect(deepDiff(null, null)).toEqual([]);
    });

    it('should detect primitive differences', () => {
      const result = deepDiff(1, 2);
      expect(result).toEqual([{ path: 'root', oldValue: 1, newValue: 2 }]);
    });

    it('should detect string differences', () => {
      const result = deepDiff('hello', 'world');
      expect(result).toEqual([{ path: 'root', oldValue: 'hello', newValue: 'world' }]);
    });

    it('should detect boolean differences', () => {
      const result = deepDiff(true, false);
      expect(result).toEqual([{ path: 'root', oldValue: true, newValue: false }]);
    });

    it('should handle null to value transition', () => {
      const result = deepDiff(null, 'value');
      expect(result).toEqual([{ path: 'root', oldValue: null, newValue: 'value' }]);
    });

    it('should handle value to null transition', () => {
      const result = deepDiff('value', null);
      expect(result).toEqual([{ path: 'root', oldValue: 'value', newValue: null }]);
    });

    it('should handle undefined to value transition', () => {
      const result = deepDiff(undefined, 'value');
      expect(result).toEqual([{ path: 'root', oldValue: undefined, newValue: 'value' }]);
    });

    it('should handle value to undefined transition', () => {
      const result = deepDiff('value', undefined);
      expect(result).toEqual([{ path: 'root', oldValue: 'value', newValue: undefined }]);
    });

    it('should return empty array for identical objects', () => {
      const obj = { name: 'Test', value: 123 };
      expect(deepDiff(obj, { ...obj })).toEqual([]);
    });

    it('should detect simple object property differences', () => {
      const obj1 = { name: 'Test', value: 123 };
      const obj2 = { name: 'Test', value: 456 };
      const result = deepDiff(obj1, obj2);
      expect(result).toEqual([{ path: 'value', oldValue: 123, newValue: 456 }]);
    });

    it('should detect added properties', () => {
      const obj1 = { name: 'Test' };
      const obj2 = { name: 'Test', value: 123 };
      const result = deepDiff(obj1, obj2);
      expect(result).toEqual([{ path: 'value', oldValue: undefined, newValue: 123 }]);
    });

    it('should detect removed properties', () => {
      const obj1 = { name: 'Test', value: 123 };
      const obj2 = { name: 'Test' };
      const result = deepDiff(obj1, obj2);
      expect(result).toEqual([{ path: 'value', oldValue: 123, newValue: undefined }]);
    });

    it('should detect nested object differences', () => {
      const obj1 = { nested: { value: 1 } };
      const obj2 = { nested: { value: 2 } };
      const result = deepDiff(obj1, obj2);
      expect(result).toEqual([{ path: 'nested.value', oldValue: 1, newValue: 2 }]);
    });

    it('should detect deeply nested differences', () => {
      const obj1 = { level1: { level2: { level3: 'old' } } };
      const obj2 = { level1: { level2: { level3: 'new' } } };
      const result = deepDiff(obj1, obj2);
      expect(result).toEqual([{ path: 'level1.level2.level3', oldValue: 'old', newValue: 'new' }]);
    });

    it('should return empty array for identical arrays', () => {
      expect(deepDiff([1, 2, 3], [1, 2, 3])).toEqual([]);
    });

    it('should detect array element differences', () => {
      const result = deepDiff([1, 2, 3], [1, 4, 3]);
      expect(result).toEqual([{ path: '[1]', oldValue: 2, newValue: 4 }]);
    });

    it('should detect array length increase', () => {
      const result = deepDiff([1, 2], [1, 2, 3]);
      expect(result).toEqual([{ path: '[2]', oldValue: undefined, newValue: 3 }]);
    });

    it('should detect array length decrease', () => {
      const result = deepDiff([1, 2, 3], [1, 2]);
      expect(result).toEqual([{ path: '[2]', oldValue: 3, newValue: undefined }]);
    });

    it('should detect nested array differences', () => {
      const obj1 = { items: [{ id: 1, name: 'A' }] };
      const obj2 = { items: [{ id: 1, name: 'B' }] };
      const result = deepDiff(obj1, obj2);
      expect(result).toEqual([{ path: 'items[0].name', oldValue: 'A', newValue: 'B' }]);
    });

    it('should detect type change from array to object', () => {
      const result = deepDiff([1, 2], { a: 1 });
      expect(result).toEqual([{ path: 'root', oldValue: [1, 2], newValue: { a: 1 } }]);
    });

    it('should detect type change from object to array', () => {
      const result = deepDiff({ a: 1 }, [1, 2]);
      expect(result).toEqual([{ path: 'root', oldValue: { a: 1 }, newValue: [1, 2] }]);
    });

    it('should handle multiple differences', () => {
      const obj1 = { a: 1, b: 2, c: 3 };
      const obj2 = { a: 10, b: 2, c: 30 };
      const result = deepDiff(obj1, obj2);
      expect(result).toHaveLength(2);
      expect(result).toContainEqual({ path: 'a', oldValue: 1, newValue: 10 });
      expect(result).toContainEqual({ path: 'c', oldValue: 3, newValue: 30 });
    });

    it('should handle complex nested structure', () => {
      const obj1 = {
        user: { name: 'John', address: { city: 'NYC', zip: '10001' } },
        items: [{ id: 1 }, { id: 2 }]
      };
      const obj2 = {
        user: { name: 'Jane', address: { city: 'NYC', zip: '10002' } },
        items: [{ id: 1 }, { id: 3 }]
      };
      const result = deepDiff(obj1, obj2);
      expect(result).toHaveLength(3);
      expect(result).toContainEqual({ path: 'user.name', oldValue: 'John', newValue: 'Jane' });
      expect(result).toContainEqual({ path: 'user.address.zip', oldValue: '10001', newValue: '10002' });
      expect(result).toContainEqual({ path: 'items[1].id', oldValue: 2, newValue: 3 });
    });
  });

  describe('formatDiffValue', () => {
    it('should format null', () => {
      expect(formatDiffValue(null)).toBe('null');
    });

    it('should format undefined', () => {
      expect(formatDiffValue(undefined)).toBe('undefined');
    });

    it('should format strings with quotes', () => {
      expect(formatDiffValue('hello')).toBe('"hello"');
    });

    it('should format numbers', () => {
      expect(formatDiffValue(123)).toBe('123');
      expect(formatDiffValue(3.14)).toBe('3.14');
    });

    it('should format booleans', () => {
      expect(formatDiffValue(true)).toBe('true');
      expect(formatDiffValue(false)).toBe('false');
    });

    it('should format objects as JSON', () => {
      expect(formatDiffValue({ a: 1 })).toBe('{"a":1}');
    });

    it('should format arrays as JSON', () => {
      expect(formatDiffValue([1, 2, 3])).toBe('[1,2,3]');
    });
  });

  describe('getDiffSummary', () => {
    it('should return no differences message for empty array', () => {
      expect(getDiffSummary([])).toBe('No differences found');
    });

    it('should return singular message for one difference', () => {
      const diff: JsonDiff[] = [{ path: 'test', oldValue: 1, newValue: 2 }];
      expect(getDiffSummary(diff)).toBe('1 difference found');
    });

    it('should return plural message for multiple differences', () => {
      const diff: JsonDiff[] = [
        { path: 'a', oldValue: 1, newValue: 2 },
        { path: 'b', oldValue: 3, newValue: 4 },
        { path: 'c', oldValue: 5, newValue: 6 }
      ];
      expect(getDiffSummary(diff)).toBe('3 differences found');
    });
  });
});

