import { describe, it, expect, vi, beforeEach } from 'vitest';
import { performanceUtils } from '../queryMonitoring';
import { logger } from '@/utils/logger';

vi.mock('@/utils/logger', () => ({
  logger: {
    warn: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
  },
}));

describe('queryMonitoring', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Note: QueryMonitor class is disabled in test mode (isEnabled = process.env.NODE_ENV === 'development')
  // So we can only test performanceUtils which don't depend on isEnabled state

  describe('performanceUtils', () => {
    it('should log index usage', () => {
      performanceUtils.logIndexUsage('TestQuery', ['idx_1', 'idx_2']);
      expect(logger.debug).toHaveBeenCalledWith(
        '🔍 Query "TestQuery" should use indexes:',
        ['idx_1', 'idx_2']
      );
    });

    it('should warn about missing indexes', () => {
      performanceUtils.warnMissingIndex('TestQuery', 'idx_missing');
      expect(logger.warn).toHaveBeenCalledWith(
        '⚠️ Query "TestQuery" may benefit from index:',
        'idx_missing'
      );
    });

    it('should log index usage with single index', () => {
      performanceUtils.logIndexUsage('SingleIndexQuery', ['idx_org_id']);
      expect(logger.debug).toHaveBeenCalledWith(
        '🔍 Query "SingleIndexQuery" should use indexes:',
        ['idx_org_id']
      );
    });

    it('should warn about missing index with complex name', () => {
      performanceUtils.warnMissingIndex('ComplexQuery', 'idx_equipment_organization_id_status');
      expect(logger.warn).toHaveBeenCalledWith(
        '⚠️ Query "ComplexQuery" may benefit from index:',
        'idx_equipment_organization_id_status'
      );
    });
  });
});
