import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { DashboardNoTeamsCard } from '../DashboardNoTeamsCard';

describe('DashboardNoTeamsCard', () => {
  it('renders welcome message with organization name', () => {
    render(<DashboardNoTeamsCard organizationName="Acme Corp" />);

    expect(screen.getByText('Welcome to Acme Corp')).toBeInTheDocument();
  });

  it('renders description with organization name', () => {
    render(<DashboardNoTeamsCard organizationName="Test Organization" />);

    expect(
      screen.getByText(/You are not yet a member of any teams in Test Organization/)
    ).toBeInTheDocument();
  });

  it('provides guidance to contact administrator', () => {
    render(<DashboardNoTeamsCard organizationName="Acme Corp" />);

    expect(
      screen.getByText(/Contact an organization administrator/)
    ).toBeInTheDocument();
  });

  it('renders inside a Card component', () => {
    const { container } = render(<DashboardNoTeamsCard organizationName="Acme Corp" />);

    // Card component should be rendered
    expect(container.querySelector('[class*="rounded"]')).toBeInTheDocument();
  });
});
