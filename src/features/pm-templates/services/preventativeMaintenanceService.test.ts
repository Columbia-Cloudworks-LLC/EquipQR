import { beforeEach, describe, expect, it, vi } from 'vitest';

import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';
import { getPMByWorkOrderId } from './preventativeMaintenanceService';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

vi.mock('@/utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

function createPMLookupQuery(result: { data: unknown; error: unknown }) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue(result),
    single: vi.fn().mockResolvedValue(result),
  };
}

describe('preventativeMaintenanceService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getPMByWorkOrderId', () => {
    it('returns null without logging an error when the work order has no PM row', async () => {
      const query = createPMLookupQuery({ data: null, error: null });
      vi.mocked(supabase.from).mockReturnValue(query as never);

      const result = await getPMByWorkOrderId('wo-1', 'org-1');

      expect(result).toBeNull();
      expect(supabase.from).toHaveBeenCalledWith('preventative_maintenance');
      expect(query.select).toHaveBeenCalledWith('*');
      expect(query.eq).toHaveBeenCalledWith('work_order_id', 'wo-1');
      expect(query.eq).toHaveBeenCalledWith('organization_id', 'org-1');
      expect(query.order).toHaveBeenCalledWith('created_at', { ascending: true });
      expect(query.limit).toHaveBeenCalledWith(1);
      expect(query.maybeSingle).toHaveBeenCalledTimes(1);
      expect(query.single).not.toHaveBeenCalled();
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('returns the first PM row for legacy work-order progress lookups', async () => {
      const pm = {
        id: 'pm-1',
        work_order_id: 'wo-1',
        organization_id: 'org-1',
        created_at: '2024-01-01T00:00:00Z',
      };
      const query = createPMLookupQuery({ data: pm, error: null });
      vi.mocked(supabase.from).mockReturnValue(query as never);

      const result = await getPMByWorkOrderId('wo-1', 'org-1');

      expect(result).toEqual(pm);
      expect(query.limit).toHaveBeenCalledWith(1);
      expect(query.maybeSingle).toHaveBeenCalledTimes(1);
    });
  });
});
