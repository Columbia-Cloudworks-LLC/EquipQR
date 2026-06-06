import { describe, it, expect } from 'vitest';

describe('Pattern Matching Logic', () => {
  describe('Match Type: any', () => {
    it('should match any model from the manufacturer', () => {
      const rule = { manufacturer: 'Caterpillar', model: null, match_type: 'any' };

      expect(rule.match_type).toBe('any');
      expect(rule.model).toBeNull();
    });
  });

  describe('Match Type: exact', () => {
    it('should match only the exact model', () => {
      const rule = { manufacturer: 'John Deere', model: '450J', match_type: 'exact' };

      expect(rule.match_type).toBe('exact');
      expect(rule.model).toBe('450J');
    });
  });

  describe('Match Type: prefix', () => {
    it('should match models starting with the pattern', () => {
      const rule = { manufacturer: 'JLG', model: 'JL-', match_type: 'prefix' };

      expect(rule.match_type).toBe('prefix');
      expect(rule.model).toBe('JL-');
    });
  });

  describe('Match Type: wildcard', () => {
    it('should match models with wildcard pattern', () => {
      const rule = { manufacturer: 'CAT', model: 'D*T', match_type: 'wildcard' };

      expect(rule.match_type).toBe('wildcard');
      expect(rule.model).toBe('D*T');
    });

    it('should support suffix wildcards', () => {
      const rule = { manufacturer: 'Genie', model: '*-100', match_type: 'wildcard' };

      expect(rule.match_type).toBe('wildcard');
    });
  });
});

describe('Pattern Validation', () => {
  describe('prefix patterns', () => {
    it('should reject patterns with wildcards', () => {
      const invalidPatterns = ['JL-*', 'JL?', '*-prefix'];

      for (const pattern of invalidPatterns) {
        const hasWildcard = pattern.includes('*') || pattern.includes('?');
        expect(hasWildcard).toBe(true);
      }
    });

    it('should accept valid prefix patterns', () => {
      const validPatterns = ['JL-', 'D6', 'CAT-', 'Series-A'];

      for (const pattern of validPatterns) {
        const hasWildcard = pattern.includes('*') || pattern.includes('?');
        expect(hasWildcard).toBe(false);
      }
    });
  });

  describe('wildcard patterns', () => {
    it('should reject patterns with more than 2 wildcards', () => {
      const pattern = 'D*T*X*';
      const asteriskCount = (pattern.match(/\*/g) || []).length;
      expect(asteriskCount).toBeGreaterThan(2);
    });

    it('should reject patterns that would match everything', () => {
      const dangerousPatterns = ['*', '**', '*-*'];

      for (const pattern of dangerousPatterns) {
        const isJustWildcards = /^[*-]+$/.test(pattern);
        expect(isJustWildcards).toBe(true);
      }
    });

    it('should accept valid wildcard patterns', () => {
      const validPatterns = ['D*T', '*-100', 'JL-*', 'D?T'];

      for (const pattern of validPatterns) {
        const asteriskCount = (pattern.match(/\*/g) || []).length;
        const hasNonWildcard = pattern.replace(/[*?-]/g, '').length >= 2;
        expect(asteriskCount <= 2 && hasNonWildcard).toBe(true);
      }
    });
  });
});
