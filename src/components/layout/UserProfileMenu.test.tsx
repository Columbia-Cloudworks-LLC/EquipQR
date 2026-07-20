import React from 'react';
import { render, screen, waitFor } from '@vitest-harness/utils/test-utils';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const signOutMock = vi.fn();
const openBugReportMock = vi.fn();

let mockCurrentUser: {
  id: string;
  name: string;
  email: string;
  avatar_url?: string | null;
} = {
  id: 'test-user',
  name: 'Test User',
  email: 'test@example.com',
  avatar_url: null,
};

/** Radix Avatar only exposes the img after load; jsdom never fires that by default. */
function stubImageLoadSuccess() {
  const descriptor = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src');
  Object.defineProperty(HTMLImageElement.prototype, 'src', {
    configurable: true,
    set(this: HTMLImageElement, value: string) {
      this.setAttribute('src', value);
      queueMicrotask(() => {
        this.dispatchEvent(new Event('load'));
      });
    },
    get(this: HTMLImageElement) {
      return this.getAttribute('src') ?? '';
    },
  });
  return () => {
    if (descriptor) {
      Object.defineProperty(HTMLImageElement.prototype, 'src', descriptor);
    }
  };
}

let restoreImageSrc: (() => void) | undefined;

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ signOut: signOutMock }),
}));

vi.mock('@/contexts/useUser', () => ({
  useUser: () => ({
    currentUser: mockCurrentUser,
    isLoading: false,
    error: null,
    refreshUser: vi.fn(),
  }),
}));

vi.mock('@/hooks/use-mobile', () => ({
  useIsMobile: () => false,
}));

vi.mock('@/features/tickets/context/BugReportContext', () => ({
  useBugReport: () => ({ openBugReport: openBugReportMock }),
}));

vi.mock('@/contexts/OrganizationContext', () => ({
  useOrganization: () => ({
    organizationId: 'org-1',
    switchOrganization: vi.fn(),
  }),
}));

vi.mock('@/hooks/useOrganizationNotifications', () => ({
  useOrganizationNotifications: () => ({
    notifications: [],
    unreadCount: 0,
  }),
}));

const resolveImageDisplayUrl = vi.fn();

vi.mock('@/services/imageUploadService', async () => {
  const actual = await vi.importActual<typeof import('@/services/imageUploadService')>(
    '@/services/imageUploadService',
  );
  return {
    ...actual,
    resolveImageDisplayUrl: (...args: unknown[]) => resolveImageDisplayUrl(...args),
  };
});

import UserProfileMenu from './UserProfileMenu';

describe('UserProfileMenu', () => {
  beforeEach(() => {
    signOutMock.mockReset();
    openBugReportMock.mockReset();
    resolveImageDisplayUrl.mockReset();
    resolveImageDisplayUrl.mockImplementation(async (_bucket: string, stored: string) => {
      const trimmed = stored?.trim() ?? '';
      if (!trimmed) return null;
      if (/^https?:\/\//i.test(trimmed)) return trimmed;
      return `https://signed.example/${trimmed}`;
    });
    restoreImageSrc = stubImageLoadSuccess();
    mockCurrentUser = {
      id: 'test-user',
      name: 'Test User',
      email: 'test@example.com',
      avatar_url: null,
    };
  });

  afterEach(() => {
    restoreImageSrc?.();
    restoreImageSrc = undefined;
  });

  it('renders an accessible avatar trigger labeled with the current user', () => {
    render(<UserProfileMenu />);
    expect(
      screen.getByRole('button', { name: /user menu \(test user\)/i }),
    ).toBeInTheDocument();
  });

  it('shows initials when no avatar URL is available', () => {
    const { container } = render(<UserProfileMenu />);
    expect(screen.getByText('TU')).toBeInTheDocument();
    expect(container.querySelector('img')).toBeNull();
  });

  it('shows a Google (http) avatar image on the trigger when provided', async () => {
    mockCurrentUser = {
      ...mockCurrentUser,
      avatar_url: 'https://lh3.googleusercontent.com/a/photo',
    };
    const { container } = render(<UserProfileMenu />);

    await waitFor(() => {
      // alt="" is decorative; query the DOM rather than role="img"
      expect(container.querySelector('img')).toHaveAttribute(
        'src',
        'https://lh3.googleusercontent.com/a/photo',
      );
    });
  });

  it('shows a resolved EquipQR storage avatar on the trigger when provided', async () => {
    mockCurrentUser = {
      ...mockCurrentUser,
      avatar_url: 'user-1/avatar.webp',
    };
    const { container } = render(<UserProfileMenu />);

    await waitFor(() => {
      expect(container.querySelector('img')).toHaveAttribute(
        'src',
        'https://signed.example/user-1/avatar.webp',
      );
    });
  });

  it('opens the dropdown and shows the name, email, avatar, and account actions', async () => {
    const user = userEvent.setup();
    mockCurrentUser = {
      ...mockCurrentUser,
      avatar_url: 'https://lh3.googleusercontent.com/a/photo',
    };
    const { container } = render(<UserProfileMenu />);

    await waitFor(() => {
      expect(container.querySelector('img')).toBeTruthy();
    });

    await user.click(
      screen.getByRole('button', { name: /user menu \(test user\)/i }),
    );

    expect(await screen.findByText('Test User')).toBeInTheDocument();
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
    // Menu content portals outside the render container
    await waitFor(() => {
      expect(document.querySelectorAll('img').length).toBeGreaterThanOrEqual(2);
    });
    expect(screen.getByRole('link', { name: /^settings$/i })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /help center/i })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /support & tickets/i })).toBeInTheDocument();
    expect(
      screen.getByRole('menuitem', { name: /report an issue/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /sign out/i })).toBeInTheDocument();
  });

  it('invokes the bug report dialog when "Report an Issue" is selected', async () => {
    const user = userEvent.setup();
    render(<UserProfileMenu />);

    await user.click(
      screen.getByRole('button', { name: /user menu \(test user\)/i }),
    );
    await user.click(
      await screen.findByRole('menuitem', { name: /report an issue/i }),
    );

    expect(openBugReportMock).toHaveBeenCalledTimes(1);
  });

  it('invokes signOut when "Sign out" is selected', async () => {
    const user = userEvent.setup();
    render(<UserProfileMenu />);

    await user.click(
      screen.getByRole('button', { name: /user menu \(test user\)/i }),
    );
    await user.click(
      await screen.findByRole('menuitem', { name: /sign out/i }),
    );

    expect(signOutMock).toHaveBeenCalledTimes(1);
  });
});
