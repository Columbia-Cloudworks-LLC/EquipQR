import { Users, Shield, BarChart2 } from 'lucide-react';
import { landingImage } from '@/lib/landingImage';
import type { Benefit, FeaturePageContent, ImageScreenshot, Step } from './featurePageTypes';

export const content: FeaturePageContent = {
  benefitsTitle: 'Each crew sees only their machines',
  benefitsDescription:
    'Give each team a view of its equipment and work orders. Roles decide who edits and who only looks.',
  stepsTitle: 'How it works',
  stepsDescription: 'Create a team, assign machines and jobs, watch the load.',
  showcaseTitle: 'Teams and roles',
  showcaseDescription: 'Org teams, member counts, and Manager / Technician / Requestor / Viewer roles.',
  showcaseClassName: 'bg-muted/30',
  ctaTitle: 'Create the first team',
  ctaDescription:
    'Create a free account, add a team, and put the first machines on it.',
  ctaPrimaryText: 'Create the first team',
};

export const benefits: Benefit[] = [
  {
    icon: Users,
    iconColor: 'success',
    title: 'Crews with their own machines',
    subtitle: 'Location, trade, or customer',
    description:
      'Create teams that match how the shop actually runs. Assign equipment and work orders so members see only their machines.',
    benefits: ['Team-scoped equipment', 'Team-scoped work orders'],
    benefitColor: 'success',
  },
  {
    icon: Shield,
    iconColor: 'info',
    title: 'Roles that match the floor',
    subtitle: 'Manager, technician, requestor, viewer',
    description:
      'Assign admin, member, or viewer roles at the organization and team level. Admins manage settings and members. Members perform work. Viewers see read-only data.',
    benefits: ['Org and team roles', 'Invite and manage members', 'Secure by default'],
    benefitColor: 'info',
  },
  {
    icon: BarChart2,
    iconColor: 'warning',
    title: 'Who is overloaded',
    subtitle: 'See load, then reassign',
    description:
      'See how work is spread across teams and technicians. Filters show overloaded assignees so you can reassign.',
    benefits: ['Team dashboards', 'Assignee load'],
    benefitColor: 'warning',
  },
];

export const steps: Step[] = [
  {
    number: 1,
    title: 'Create Teams',
    description:
      'Create teams that match your structure, by location, trade, or project. Add members and assign roles. Each team can have its own equipment and work order scope.',
  },
  {
    number: 2,
    title: 'Assign Equipment & Work',
    description:
      'Link equipment to teams so members see only relevant assets. Assign work orders to teams or individuals. Use filters and dashboards to view workload by team.',
  },
  {
    number: 3,
    title: 'Collaborate in Context',
    description:
      'Team members access equipment, work orders, and PMs from their team view. Admins manage members, settings, and visibility. Viewers get read-only access where configured.',
  },
  {
    number: 4,
    title: 'Track & Rebalance',
    description:
      'Monitor completion rates, overdue work, and assignee load. Reassign work or adjust team scope as needed. Use fleet efficiency and dashboard metrics to rebalance allocation.',
  },
];

export const showcases: ImageScreenshot[] = [
  {
    kind: 'image',
    imageUrl: landingImage('teams-list-2026-04.webp'),
    imageAlt: 'Teams list showing all teams with member counts and roles',
    title: 'Organization Teams',
    description:
      'View all teams in your organization at a glance. See team descriptions, member counts, and quickly identify who belongs to each team. Create new teams or manage existing ones from a single dashboard.',
  },
  {
    kind: 'image',
    imageUrl: landingImage('team-detail-2026-04.webp'),
    imageAlt: 'Team detail page showing role assignments for team members',
    title: 'Role-Based Team Access',
    description:
      'Assign each team member a role. Manager, Technician, Requestor, or Viewer. Managers oversee the team and handle work order flow. Technicians perform and log work. Requestors submit work order requests directly from a QR scan. Viewers get read-only access. Every action is attributed by role so you always know who did what.',
  },
];

export const heroIcon = Users;
