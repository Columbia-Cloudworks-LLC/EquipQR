import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { UserIdentityCard } from '@/components/common/UserIdentityCard';

vi.mock('@/hooks/useResolvedAvatarUrl', () => ({
  useResolvedAvatarUrl: () => ({ data: null }),
}));

describe('UserIdentityCard', () => {
  it('renders the user name and initials fallback', () => {
    render(<UserIdentityCard name="Alex Apex" />);

    expect(screen.getByTestId('user-identity-card')).toBeInTheDocument();
    expect(screen.getByText('Alex Apex')).toBeInTheDocument();
    expect(screen.getByText('AA')).toBeInTheDocument();
  });

  it('renders a system identity without a person avatar', () => {
    render(<UserIdentityCard name="System" />);

    expect(screen.getByText('System')).toBeInTheDocument();
    expect(screen.queryByText('?')).not.toBeInTheDocument();
  });
});
