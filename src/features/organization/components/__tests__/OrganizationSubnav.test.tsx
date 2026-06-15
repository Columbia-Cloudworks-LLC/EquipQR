import { screen } from '@testing-library/react';
import { customRender } from '@/test/utils/renderUtils';
import { OrganizationSubnav } from '../OrganizationSubnav';
import {
  ORGANIZATION_INTEGRATIONS_PATH,
  ORGANIZATION_MEMBERS_PATH,
  ORGANIZATION_SETTINGS_PATH,
} from '@/features/organization/constants/routes';

describe('OrganizationSubnav', () => {
  it('renders members, settings, and integrations links', () => {
    customRender(<OrganizationSubnav />, { initialEntries: [ORGANIZATION_MEMBERS_PATH] });

    expect(screen.getByRole('link', { name: /members/i })).toHaveAttribute('href', ORGANIZATION_MEMBERS_PATH);
    expect(screen.getByRole('link', { name: /settings/i })).toHaveAttribute('href', ORGANIZATION_SETTINGS_PATH);
    expect(screen.getByRole('link', { name: /integrations/i })).toHaveAttribute(
      'href',
      ORGANIZATION_INTEGRATIONS_PATH,
    );
  });
});
