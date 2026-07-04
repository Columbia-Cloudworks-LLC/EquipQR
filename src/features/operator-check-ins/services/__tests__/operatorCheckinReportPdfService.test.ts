import { describe, expect, it } from 'vitest';
import { __operatorCheckinReportExportTestables } from '@/features/operator-check-ins/services/operatorCheckinReportExportHelpers';

describe('operatorCheckinReportPdfService', () => {
  it('sanitizes filename parts', () => {
    expect(__operatorCheckinReportExportTestables.sanitizeFilenamePart('Truck #101')).toBe('Truck-101');
  });
});
