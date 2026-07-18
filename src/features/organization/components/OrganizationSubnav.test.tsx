import { screen } from '@testing-library/react';
import { customRender, renderAsPersona } from '@vitest-harness/utils/renderUtils';
import { OrganizationSubnav } from './OrganizationSubnav';
import {
  ORGANIZATION_AUDIT_LOG_PATH,
  ORGANIZATION_INTEGRATIONS_PATH,
  ORGANIZATION_MEMBERS_PATH,
  ORGANIZATION_SETTINGS_PATH,
} from '@/features/organization/constants/routes';

describe('OrganizationSubnav', () => {
  it('renders members, settings, integrations, and audit log links for admins', () => {
    customRender(<OrganizationSubnav />, { initialEntries: [ORGANIZATION_MEMBERS_PATH] });

    expect(screen.getByRole('link', { name: /members/i })).toHaveAttribute('href', ORGANIZATION_MEMBERS_PATH);
    expect(screen.getByRole('link', { name: /settings/i })).toHaveAttribute('href', ORGANIZATION_SETTINGS_PATH);
    expect(screen.getByRole('link', { name: /integrations/i })).toHaveAttribute(
      'href',
      ORGANIZATION_INTEGRATIONS_PATH,
    );
    expect(screen.getByRole('link', { name: /audit log/i })).toHaveAttribute(
      'href',
      ORGANIZATION_AUDIT_LOG_PATH,
    );
  });

  it('hides the audit log link from non-admin members (#1122)', () => {
    renderAsPersona(<OrganizationSubnav />, 'technician', {
      initialEntries: [ORGANIZATION_MEMBERS_PATH],
    });

    expect(screen.getByRole('link', { name: /members/i })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /audit log/i })).not.toBeInTheDocument();
  });
});
