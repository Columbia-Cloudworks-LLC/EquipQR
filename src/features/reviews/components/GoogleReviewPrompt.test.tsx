import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { GoogleReviewPrompt } from './GoogleReviewPrompt';
import { GBP_REVIEW_PROMPT_STORAGE_KEY } from '@/features/reviews/lib/googleReviewPrompt';

const REVIEW_URL = 'https://g.page/r/Cf8iRdYNXzu1EBM/review';

const toastMock = vi.hoisted(() => vi.fn());
vi.mock('sonner', () => ({ toast: toastMock }));

const orgState = vi.hoisted(() => ({
  currentOrganization: {
    id: 'org-1',
    userRole: 'owner' as 'owner' | 'admin' | 'member',
    userStatus: 'active' as 'active' | 'pending' | 'inactive',
  } as {
    id: string;
    userRole: 'owner' | 'admin' | 'member';
    userStatus: 'active' | 'pending' | 'inactive';
  } | null,
}));
vi.mock('@/contexts/OrganizationContext', () => ({
  useOrganization: () => orgState,
}));

const milestone = vi.hoisted(() => ({
  reached: true,
  calls: [] as Array<{ organizationId: string | undefined; enabled: boolean }>,
}));
vi.mock('@/features/reviews/hooks/useReviewMilestone', () => ({
  useReviewMilestone: (organizationId: string | undefined, enabled: boolean) => {
    milestone.calls.push({ organizationId, enabled });
    return { data: enabled ? milestone.reached : undefined };
  },
}));

describe('GoogleReviewPrompt', () => {
  beforeEach(() => {
    localStorage.clear();
    toastMock.mockClear();
    milestone.reached = true;
    milestone.calls = [];
    orgState.currentOrganization = { id: 'org-1', userRole: 'owner', userStatus: 'active' };
    vi.stubEnv('VITE_GBP_REVIEW_URL', REVIEW_URL);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('prompts an owner once the milestone is reached and records it immediately', () => {
    render(<GoogleReviewPrompt />);

    expect(toastMock).toHaveBeenCalledTimes(1);
    expect(toastMock.mock.calls[0][1]).toMatchObject({
      duration: Infinity,
      action: { label: 'Leave a review' },
      cancel: { label: 'Not now' },
    });
    expect(localStorage.getItem(GBP_REVIEW_PROMPT_STORAGE_KEY)).not.toBeNull();
  });

  it('opens the review link in a new tab from the action', () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    render(<GoogleReviewPrompt />);

    const options = toastMock.mock.calls[0][1] as { action: { onClick: () => void } };
    options.action.onClick();

    expect(open).toHaveBeenCalledWith(REVIEW_URL, '_blank', 'noopener,noreferrer');
    open.mockRestore();
  });

  it('never prompts again after it was shown', () => {
    const first = render(<GoogleReviewPrompt />);
    first.unmount();
    render(<GoogleReviewPrompt />);

    expect(toastMock).toHaveBeenCalledTimes(1);
  });

  it('prompts admins too', () => {
    orgState.currentOrganization = { id: 'org-1', userRole: 'admin', userStatus: 'active' };
    render(<GoogleReviewPrompt />);
    expect(toastMock).toHaveBeenCalledTimes(1);
  });

  it('does not query or prompt for members', () => {
    orgState.currentOrganization = { id: 'org-1', userRole: 'member', userStatus: 'active' };
    render(<GoogleReviewPrompt />);

    expect(milestone.calls.every((call) => !call.enabled)).toBe(true);
    expect(toastMock).not.toHaveBeenCalled();
  });

  it('does not prompt before the milestone', () => {
    milestone.reached = false;
    render(<GoogleReviewPrompt />);

    expect(toastMock).not.toHaveBeenCalled();
    expect(localStorage.getItem(GBP_REVIEW_PROMPT_STORAGE_KEY)).toBeNull();
  });

  it('does nothing when no review URL is configured', () => {
    vi.stubEnv('VITE_GBP_REVIEW_URL', '');
    render(<GoogleReviewPrompt />);

    expect(milestone.calls.every((call) => !call.enabled)).toBe(true);
    expect(toastMock).not.toHaveBeenCalled();
  });
});
