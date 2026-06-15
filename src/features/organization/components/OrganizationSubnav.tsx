import { NavLink } from 'react-router-dom';
import { Plug, Settings, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
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
] as const;

export function OrganizationSubnav() {
  return (
    <nav aria-label="Organization sections" className="border-b mb-4 sm:mb-6">
      <div className="flex w-full gap-1 overflow-x-auto pb-px sm:gap-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {organizationLinks.map(({ to, label, icon: Icon, ...rest }) => (
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
