import { render, screen, createSettingsTestWrapper, SYDNEY_USER_SETTINGS } from '@vitest-harness/utils/test-utils';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { formatDate } from '@/utils/dateFormatter';
import type { PartAlternateGroup } from '@/features/inventory/types/inventory';
import * as exportUtils from '@/utils/exportUtils';
import AlternateGroupsDownloadMenu from './AlternateGroupsDownloadMenu';

vi.mock('@/utils/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

const SettingsWrapper = createSettingsTestWrapper();

const CREATED_UTC = '2023-12-24T15:00:00.000Z';
const UPDATED_UTC = '2023-12-25T03:00:00.000Z';

const mockGroup: PartAlternateGroup = {
  id: 'group-1',
  organization_id: 'org-1',
  name: 'Alt group',
  description: null,
  status: 'unverified',
  notes: null,
  evidence_url: null,
  created_by: 'user-1',
  verified_by: null,
  verified_at: null,
  created_at: CREATED_UTC,
  updated_at: UPDATED_UTC,
  member_count: 2,
};

describe('AlternateGroupsDownloadMenu', () => {
  beforeEach(() => {
    vi.spyOn(exportUtils, 'downloadCsv').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('CSV export formats created_at and updated_at using user timezone settings', async () => {
    const user = userEvent.setup();
    render(<AlternateGroupsDownloadMenu groups={[mockGroup]} />, {
      wrapper: SettingsWrapper,
    });

    await user.click(
      screen.getByRole('button', { name: /download alternate groups/i })
    );
    await user.click(screen.getByText('CSV'));

    expect(exportUtils.downloadCsv).toHaveBeenCalled();
    const csvArg = vi.mocked(exportUtils.downloadCsv).mock.calls[0][0];
    expect(csvArg).toContain(formatDate(CREATED_UTC, SYDNEY_USER_SETTINGS));
    expect(csvArg).toContain(formatDate(UPDATED_UTC, SYDNEY_USER_SETTINGS));
  });
});