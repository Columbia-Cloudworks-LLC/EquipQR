import { FeatureSection } from './FeatureSection';

const ORG_ROLES = [
  {
    badge: 'O',
    badgeClass: 'bg-primary text-primary-foreground',
    title: 'Owner',
    description:
      'Full account control. Manages billing, integrations, and all organization settings. Can promote or remove any member.',
  },
  {
    badge: 'A',
    badgeClass: 'bg-info text-info-foreground',
    title: 'Admin',
    description:
      'Manages members, teams, and equipment organization-wide. Cannot change billing or owner-level settings.',
  },
  {
    badge: 'M',
    badgeClass: 'bg-muted text-foreground',
    title: 'Member',
    description:
      'Works within the teams they belong to. Sees only the equipment and work orders assigned to their teams.',
  },
] as const;

const TEAM_ROLES = [
  {
    badge: 'M',
    badgeClass: 'bg-success text-success-foreground',
    title: 'Manager',
    description:
      'Manages team members, equipment assignments, and QuickBooks customer mappings. Can create and close work orders.',
  },
  {
    badge: 'T',
    badgeClass: 'bg-warning text-warning-foreground',
    title: 'Technician',
    description:
      "Creates and updates work orders, completes PM checklists, and logs scan activity for their team's equipment.",
  },
  {
    badge: 'R',
    badgeClass: 'bg-info text-info-foreground',
    title: 'Requestor',
    description:
      "Designed for trusted customers. A Requestor can scan a machine's QR code to submit a work order request directly — no phone call required.",
  },
  {
    badge: 'V',
    badgeClass: 'bg-muted text-foreground',
    title: 'Viewer',
    description:
      'Read-only access to team equipment and work orders. Useful for customers, inspectors, or stakeholders who need visibility without edit rights.',
  },
] as const;

const RoleList = ({
  title,
  subtitle,
  roles,
}: {
  title: string;
  subtitle: string;
  roles: readonly { badge: string; badgeClass: string; title: string; description: string }[];
}) => (
  <div className="rounded-xl border border-border bg-card p-6">
    <h3 className="text-lg font-bold text-foreground mb-1">{title}</h3>
    <p className="text-sm text-muted-foreground mb-5">{subtitle}</p>
    <div className="space-y-4">
      {roles.map((role) => (
        <div key={role.title} className="flex gap-3">
          <span
            className={`mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${role.badgeClass}`}
          >
            {role.badge}
          </span>
          <div>
            <p className="text-sm font-semibold text-foreground">{role.title}</p>
            <p className="text-xs text-muted-foreground">{role.description}</p>
          </div>
        </div>
      ))}
    </div>
  </div>
);

export const TeamRolesPermissionsSection = () => (
  <FeatureSection
    title="Roles & Permissions"
    description="EquipQR uses a two-tier role system: organization-level roles that govern your whole account, and team-level roles that control access within each team."
  >
    <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
      <RoleList
        title="Organization Roles"
        subtitle="Set once per member when they join your organization."
        roles={ORG_ROLES}
      />
      <RoleList
        title="Team Roles"
        subtitle="Assigned independently per team, giving fine-grained control within each crew."
        roles={TEAM_ROLES}
      />
    </div>
  </FeatureSection>
);
