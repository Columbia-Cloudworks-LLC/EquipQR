import { NavLink } from 'react-router-dom';
import { History, Plug, Settings, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useOrganization } from '@/contexts/OrganizationContext';
import {
  ORGANIZATION_AUDIT_LOG_PATH,
  ORGANIZATION_INTEGRATIONS_PATH,
  ORGANIZATION_MEMBERS_PATH,
  ORGANIZATION_SETTINGS_PATH,
} from '@/features/organization/constants/routes';

const organizationLinks = [
  {
    to: ORGANIZATION_MEMBERS_PATH,
    label: 'Members',
    icon: Users,
  },
  {
    to: ORGANIZATION_SETTINGS_PATH,
    label: 'Settings',
    icon: Settings,
    end: true,
  },
  {
    to: ORGANIZATION_INTEGRATIONS_PATH,
    label: 'Integrations',
    icon: Plug,
  },
  {
    to: ORGANIZATION_AUDIT_LOG_PATH,
    label: 'Audit Log',
    icon: History,
    adminOnly: true,
  },
] as const;

export function OrganizationSubnav() {
  const { currentOrganization } = useOrganization();
  const isAdmin =
    currentOrganization?.userRole === 'owner' || currentOrganization?.userRole === 'admin';
  const visibleLinks = organizationLinks.filter(
    (link) => !('adminOnly' in link && link.adminOnly) || isAdmin,
  );

  return (
    <nav aria-label="Organization sections" className="border-b mb-4 sm:mb-6">
      <div className="flex w-full gap-1 overflow-x-auto pb-px sm:gap-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {visibleLinks.map(({ to, label, icon: Icon, ...rest }) => (
          <NavLink
            key={to}
            to={to}
            end={'end' in rest ? rest.end : undefined}
            className={({ isActive }) =>
              cn(
                'inline-flex shrink-0 items-center gap-2 rounded-none px-2 pb-2.5 pt-1.5 text-sm font-medium text-muted-foreground transition-colors sm:px-1',
                'border-b-2 border-transparent hover:text-foreground',
                isActive && 'border-primary text-foreground font-semibold',
              )
            }
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            {label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
